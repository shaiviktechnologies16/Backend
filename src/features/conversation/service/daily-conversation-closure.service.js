import { executeTransaction } from "../../../database/transaction.js";
import { workspaceRealtimeEmitter } from "../../../common/utils/workspace-event-emitter.js";
import { redisClient } from "../../../infrastructure/redis/redis.client.js";

export class DailyConversationClosureService {
  constructor({
    conversationRepository,
    timeZone = process.env.DAILY_CLOSURE_TIMEZONE || "Asia/Kolkata",
    excludeHumanActive = process.env.EXCLUDE_HUMAN_ACTIVE_FROM_DAILY_CLOSURE !== "false",
    batchSize = 100,
    transactionRunner = executeTransaction,
  }) {
    this.conversationRepository = conversationRepository;
    this.timeZone = timeZone;
    this.excludeHumanActive = excludeHumanActive;
    this.batchSize = batchSize;
    this.transactionRunner = transactionRunner;
    this.localLockMap = new Map();
  }

  /**
   * Calculates the date string (YYYY-MM-DD) and the start-of-day UTC Date object
   * for the configured business timezone (Asia/Kolkata).
   */
  getBusinessDayBoundary(now = new Date()) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: this.timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const dateStr = formatter.format(now); // e.g., "2026-10-18"

    // Construct start-of-day timestamp in the target timezone
    // Asia/Kolkata has fixed offset +05:30
    let startOfDayUtc;
    if (this.timeZone === "Asia/Kolkata") {
      startOfDayUtc = new Date(`${dateStr}T00:00:00+05:30`);
    } else {
      // General fallback using ISO offset computation
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: this.timeZone,
        timeZoneName: "shortOffset",
      }).formatToParts(now);
      const tzPart = parts.find((p) => p.type === "timeZoneName")?.value || "+05:30";
      const rawOffset = tzPart.replace("GMT", "");
      const formattedOffset = rawOffset.includes(":")
        ? rawOffset
        : `${rawOffset}:00`;
      startOfDayUtc = new Date(`${dateStr}T00:00:00${formattedOffset}`);
    }

    return {
      dateStr,
      startOfDayUtc,
      timeZone: this.timeZone,
    };
  }

  /**
   * Acquires a distributed lock using Redis, or falls back to local in-memory lock.
   */
  async acquireLock(dateStr, ttlSeconds = 3600) {
    const lockKey = `daily_conversation_closure:lock:${dateStr}`;

    if (redisClient?.isOpen) {
      try {
        const acquired = await redisClient.set(lockKey, "locked", {
          NX: true,
          EX: ttlSeconds,
        });
        return Boolean(acquired);
      } catch (err) {
        console.warn("[DailyClosure] Redis lock check warning, using local lock fallback:", err.message);
      }
    }

    const now = Date.now();
    const existing = this.localLockMap.get(lockKey);
    if (existing && existing > now) {
      return false;
    }

    this.localLockMap.set(lockKey, now + ttlSeconds * 1000);
    return true;
  }

  /**
   * Checks current closure status and counts of eligible and human-active conversations.
   */
  async getStatus() {
    const { dateStr, startOfDayUtc, timeZone } = this.getBusinessDayBoundary();

    const [eligibleCount, humanActiveCount] = await Promise.all([
      this.conversationRepository.countEligibleForDailyClosure({
        beforeDate: startOfDayUtc,
        excludeHumanActive: this.excludeHumanActive,
      }),
      this.conversationRepository.countHumanActiveBeforeDate({
        beforeDate: startOfDayUtc,
      }),
    ]);

    return {
      businessDate: dateStr,
      startOfDayUtc: startOfDayUtc.toISOString(),
      timeZone,
      excludeHumanActive: this.excludeHumanActive,
      eligibleForClosure: eligibleCount,
      skippedHumanActive: humanActiveCount,
    };
  }

  /**
   * Executes the daily conversation closure process with idempotency and batching.
   */
  async runDailyClosure({ force = false, dryRun = false } = {}) {
    const startedAt = Date.now();
    const { dateStr, startOfDayUtc, timeZone } = this.getBusinessDayBoundary();

    console.log("[DailyClosure] INITIATED", {
      businessDate: dateStr,
      startOfDayUtc: startOfDayUtc.toISOString(),
      timeZone,
      excludeHumanActive: this.excludeHumanActive,
      force,
      dryRun,
    });

    if (!force) {
      const lockAcquired = await this.acquireLock(dateStr);
      if (!lockAcquired) {
        console.log("[DailyClosure] SKIPPED - Job has already run or is currently running for today", {
          businessDate: dateStr,
        });
        return {
          success: true,
          skipped: true,
          reason: "ALREADY_PROCESSED_OR_LOCKED",
          businessDate: dateStr,
          closedCount: 0,
        };
      }
    }

    const [initialEligible, skippedHumanActive] = await Promise.all([
      this.conversationRepository.countEligibleForDailyClosure({
        beforeDate: startOfDayUtc,
        excludeHumanActive: this.excludeHumanActive,
      }),
      this.conversationRepository.countHumanActiveBeforeDate({
        beforeDate: startOfDayUtc,
      }),
    ]);

    console.log("[DailyClosure] ELIGIBILITY_ASSESSMENT", {
      initialEligible,
      skippedHumanActive,
      excludeHumanActive: this.excludeHumanActive,
    });

    if (dryRun) {
      return {
        success: true,
        dryRun: true,
        businessDate: dateStr,
        startOfDayUtc: startOfDayUtc.toISOString(),
        eligibleCount: initialEligible,
        skippedHumanActive,
        durationMs: Date.now() - startedAt,
      };
    }

    let closedCount = 0;
    let batchNumber = 0;

    while (true) {
      batchNumber++;
      const eligibleBatch =
        await this.conversationRepository.findEligibleForDailyClosure({
          beforeDate: startOfDayUtc,
          excludeHumanActive: this.excludeHumanActive,
          limit: this.batchSize,
        });

      if (!eligibleBatch || eligibleBatch.length === 0) {
        break;
      }

      console.log(`[DailyClosure] Processing batch #${batchNumber} with ${eligibleBatch.length} conversations`);

      const closedInBatch = await this.transactionRunner(async (queryRunner) => {
        const manager = queryRunner.manager;
        const batchClosed = [];

        for (const conv of eligibleBatch) {
          conv.completeConversation(null);
          await this.conversationRepository.update(conv, manager);
          batchClosed.push(conv);
        }

        return batchClosed;
      });

      for (const closedConv of closedInBatch) {
        workspaceRealtimeEmitter.emit("conversation.status.updated", {
          conversationId: closedConv.id,
          projectId: closedConv.projectId,
          isHandover: false,
          isCompleted: true,
          completedAt: closedConv.completedAt
            ? closedConv.completedAt.toISOString()
            : new Date().toISOString(),
          completedBy: "SYSTEM_DAILY_CLOSURE",
        });
      }

      closedCount += closedInBatch.length;

      // Yield event loop briefly between batches to prevent event loop starvation
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    const durationMs = Date.now() - startedAt;

    console.log("[DailyClosure] COMPLETED", {
      businessDate: dateStr,
      startOfDayUtc: startOfDayUtc.toISOString(),
      closedCount,
      skippedHumanActive,
      batchesProcessed: batchNumber,
      durationMs,
    });

    return {
      success: true,
      businessDate: dateStr,
      startOfDayUtc: startOfDayUtc.toISOString(),
      closedCount,
      skippedHumanActive,
      durationMs,
    };
  }
}
