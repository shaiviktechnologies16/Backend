export class DailyClosureScheduler {
  constructor({ dailyConversationClosureService, timeZone = "Asia/Kolkata" }) {
    this.service = dailyConversationClosureService;
    this.timeZone = timeZone;
    this.timer = null;
    this.isRunning = false;
  }

  /**
   * Calculates milliseconds until the next 00:00:00 in Asia/Kolkata timezone.
   */
  getMsUntilNextMidnight() {
    const now = new Date();

    // Determine current date in target timezone
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: this.timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const todayStr = formatter.format(now); // e.g. "2026-10-18"

    // Construct today's midnight in Asia/Kolkata (+05:30)
    const todayMidnight = new Date(`${todayStr}T00:00:00+05:30`);

    // Next midnight is 24 hours after today's midnight
    const nextMidnight = new Date(todayMidnight.getTime() + 24 * 60 * 60 * 1000);

    const msUntil = nextMidnight.getTime() - now.getTime();

    // If msUntil <= 0, add another day
    return msUntil > 0 ? msUntil : msUntil + 24 * 60 * 60 * 1000;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    this.scheduleNextRun();
    console.log(`[DailyClosureScheduler] Initialized for timezone ${this.timeZone}`);
  }

  scheduleNextRun() {
    if (!this.isRunning) return;

    const msUntilMidnight = this.getMsUntilNextMidnight();
    const hoursUntil = (msUntilMidnight / (1000 * 60 * 60)).toFixed(2);

    console.log(
      `[DailyClosureScheduler] Next daily closure scheduled in ${hoursUntil} hours (approx. midnight ${this.timeZone})`,
    );

    this.timer = setTimeout(async () => {
      try {
        console.log(`[DailyClosureScheduler] Midnight trigger firing in ${this.timeZone}`);
        await this.service.runDailyClosure();
      } catch (err) {
        console.error("[DailyClosureScheduler] Error executing scheduled daily closure:", err);
      } finally {
        this.scheduleNextRun();
      }
    }, msUntilMidnight);

    if (this.timer.unref) {
      this.timer.unref();
    }
  }

  stop() {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    console.log("[DailyClosureScheduler] Stopped");
  }
}

