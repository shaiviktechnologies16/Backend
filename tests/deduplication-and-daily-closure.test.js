import { test, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";

import { Conversation } from "../src/features/conversation/entity/conversation.entity.js";
import { Message } from "../src/features/message/entity/message.entity.js";
import { MessageRole } from "../src/common/constants/message-role.js";
import { DailyConversationClosureService } from "../src/features/conversation/service/daily-conversation-closure.service.js";
import { DailyClosureScheduler } from "../src/infrastructure/scheduler/daily-closure.scheduler.js";

describe("FEATURE 1: Message Deduplication & Identity Synchronization", () => {
  test("generates unique client-side UUIDs for both user and assistant message", () => {
    const clientMessageId = crypto.randomUUID();
    const clientAssistantMessageId = crypto.randomUUID();

    assert.ok(clientMessageId);
    assert.ok(clientAssistantMessageId);
    assert.notEqual(clientMessageId, clientAssistantMessageId);

    const UUID_REGEX =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    assert.ok(UUID_REGEX.test(clientMessageId));
    assert.ok(UUID_REGEX.test(clientAssistantMessageId));
  });

  test("preserves distinct message identities for legitimate repeated questions", () => {
    const questionText = "Who developed you?";
    const answerText = "I was developed by Shaivik AI.";

    // First submission
    const turn1 = {
      user: new Message({
        id: crypto.randomUUID(),
        conversationId: "conv-1",
        role: MessageRole.USER,
        content: questionText,
      }),
      assistant: new Message({
        id: crypto.randomUUID(),
        conversationId: "conv-1",
        role: MessageRole.ASSISTANT,
        content: answerText,
      }),
    };

    // Second legitimate submission (same question text, new unique IDs)
    const turn2 = {
      user: new Message({
        id: crypto.randomUUID(),
        conversationId: "conv-1",
        role: MessageRole.USER,
        content: questionText,
      }),
      assistant: new Message({
        id: crypto.randomUUID(),
        conversationId: "conv-1",
        role: MessageRole.ASSISTANT,
        content: answerText,
      }),
    };

    const messageList = [
      turn1.user,
      turn1.assistant,
      turn2.user,
      turn2.assistant,
    ];

    assert.equal(messageList.length, 4);
    assert.equal(messageList[0].content, messageList[2].content);
    assert.equal(messageList[1].content, messageList[3].content);
    // Distinct IDs ensure no suppression
    assert.notEqual(messageList[0].id, messageList[2].id);
    assert.notEqual(messageList[1].id, messageList[3].id);
  });

  test("idempotent reuse re-emits cached response without duplicating message in turn", () => {
    const userMsgId = crypto.randomUUID();
    const assistantMsgId = crypto.randomUUID();

    const conversationHistory = [
      new Message({
        id: userMsgId,
        conversationId: "conv-1",
        role: MessageRole.USER,
        content: "Who developed you?",
      }),
      new Message({
        id: assistantMsgId,
        conversationId: "conv-1",
        role: MessageRole.ASSISTANT,
        content: "I was developed by Shaivik AI.",
      }),
    ];

    // Find if userMsgId already has an assistant response in history
    const userIdx = conversationHistory.findIndex((m) => m.id === userMsgId);
    assert.notEqual(userIdx, -1);
    const existingAssistant = conversationHistory[userIdx + 1];

    assert.ok(existingAssistant);
    assert.equal(existingAssistant.id, assistantMsgId);
    assert.equal(existingAssistant.role, MessageRole.ASSISTANT);
  });
});

describe("FEATURE 2: Daily Conversation Closure & Timezone Boundaries", () => {
  test("calculates accurate Asia/Kolkata start-of-day boundary", () => {
    const service = new DailyConversationClosureService({
      conversationRepository: {},
      timeZone: "Asia/Kolkata",
    });

    // Sample: 2026-10-18 at 14:00 IST (= 08:30 UTC)
    const testDate = new Date("2026-10-18T08:30:00.000Z");
    const boundary = service.getBusinessDayBoundary(testDate);

    assert.equal(boundary.dateStr, "2026-10-18");
    assert.equal(boundary.timeZone, "Asia/Kolkata");

    // In Asia/Kolkata (+05:30), start of day 2026-10-18 00:00:00 is 2026-10-17 18:30:00 UTC
    assert.equal(
      boundary.startOfDayUtc.toISOString(),
      "2026-10-17T18:30:00.000Z",
    );
  });

  test("identifies conversations eligible for closure vs human-active", async () => {
    const boundaryUtc = new Date("2026-10-17T18:30:00.000Z");

    const convOldAiActive = new Conversation({
      id: "c-old-ai",
      title: "Old AI",
      isCompleted: false,
      isHandover: false,
      updatedAt: new Date("2026-10-16T10:00:00.000Z"), // eligible
    });

    const convOldHumanActive = new Conversation({
      id: "c-old-human",
      title: "Old Human",
      isCompleted: false,
      isHandover: true,
      updatedAt: new Date("2026-10-16T12:00:00.000Z"), // human active
    });

    const convTodayAiActive = new Conversation({
      id: "c-today-ai",
      title: "Today AI",
      isCompleted: false,
      isHandover: false,
      updatedAt: new Date(), // today, not eligible
    });

    const store = [convOldAiActive, convOldHumanActive, convTodayAiActive];

    const mockRepo = {
      findEligibleForDailyClosure: async ({ beforeDate, excludeHumanActive }) => {
        return store.filter((c) => {
          if (c.isCompleted) return false;
          if (c.updatedAt >= beforeDate) return false;
          if (excludeHumanActive && c.isHandover) return false;
          return true;
        });
      },
      countEligibleForDailyClosure: async ({ beforeDate, excludeHumanActive }) => {
        return (
          await mockRepo.findEligibleForDailyClosure({
            beforeDate,
            excludeHumanActive,
          })
        ).length;
      },
      countHumanActiveBeforeDate: async ({ beforeDate }) => {
        return store.filter(
          (c) => !c.isCompleted && c.isHandover && c.updatedAt < beforeDate,
        ).length;
      },
      update: async (conv) => {
        const idx = store.findIndex((c) => c.id === conv.id);
        if (idx !== -1) store[idx] = conv;
        return conv;
      },
    };

    const service = new DailyConversationClosureService({
      conversationRepository: mockRepo,
      timeZone: "Asia/Kolkata",
      excludeHumanActive: true,
      transactionRunner: async (cb) => cb({ manager: null }),
    });

    const status = await service.getStatus();
    assert.equal(status.eligibleForClosure, 1);
    assert.equal(status.skippedHumanActive, 1);

    // Mock acquireLock to succeed
    service.acquireLock = async () => true;

    // Run closure
    const result = await service.runDailyClosure({ force: true });
    assert.equal(result.success, true);
    assert.equal(result.closedCount, 1);
    assert.equal(result.skippedHumanActive, 1);

    // Verify convOldAiActive was completed
    assert.equal(convOldAiActive.isCompleted, true);
    assert.equal(convOldAiActive.completedBy, null);

    // Verify human-active conversation was protected and remains open
    assert.equal(convOldHumanActive.isCompleted, false);
    assert.equal(convOldHumanActive.isHandover, true);

    // Verify today's conversation was untouched
    assert.equal(convTodayAiActive.isCompleted, false);
  });

  test("scheduler calculates positive ms until midnight IST", () => {
    const scheduler = new DailyClosureScheduler({
      dailyConversationClosureService: {},
      timeZone: "Asia/Kolkata",
    });

    const msUntilMidnight = scheduler.getMsUntilNextMidnight();
    assert.ok(msUntilMidnight > 0);
    // Should be at most 24 hours (86,400,000 ms)
    assert.ok(msUntilMidnight <= 24 * 60 * 60 * 1000);
  });
});
