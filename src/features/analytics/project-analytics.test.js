import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { RecordVisitorEventUseCase } from "./application/use-cases/record-visitor-event.usecase.js";
import { parseDateRange } from "./application/utils/date-range.util.js";
import {
  isBot,
  parseDeviceCategory,
  parseBrowser,
  parseOperatingSystem,
  parseReferrerSource,
} from "./application/utils/analytics-parser.util.js";
import { GetProjectAnalyticsOverviewUseCase } from "./application/use-cases/get-project-analytics-overview.usecase.js";
import { GetProjectTrackingConfigUseCase } from "./application/use-cases/get-project-tracking-config.usecase.js";
import { UpdateProjectTrackingConfigUseCase } from "./application/use-cases/update-project-tracking-config.usecase.js";
import { RotateProjectTrackingKeyUseCase } from "./application/use-cases/rotate-project-tracking-key.usecase.js";

describe("Project-Level Visitor Analytics", () => {
  describe("Analytics Parser Utility", () => {
    it("detects web crawlers and bots", () => {
      assert.equal(isBot("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"), true);
      assert.equal(isBot("Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)"), true);
      assert.equal(isBot("curl/7.68.0"), true);
      assert.equal(isBot("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"), false);
      assert.equal(isBot("Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1"), false);
    });

    it("identifies device category correctly", () => {
      assert.equal(parseDeviceCategory("Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X)"), "mobile");
      assert.equal(parseDeviceCategory("Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X)"), "tablet");
      assert.equal(parseDeviceCategory("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"), "desktop");
    });

    it("parses browser and operating system correctly", () => {
      const macChrome = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
      assert.equal(parseBrowser(macChrome), "Chrome");
      assert.equal(parseOperatingSystem(macChrome), "macOS");

      const winEdge = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Edg/122.0.0.0";
      assert.equal(parseBrowser(winEdge), "Edge");
      assert.equal(parseOperatingSystem(winEdge), "Windows");
    });

    it("categorizes traffic sources accurately", () => {
      assert.equal(parseReferrerSource("https://www.google.com/search?q=shaivik"), "Google");
      assert.equal(parseReferrerSource("https://t.co/xyz123"), "Twitter / X");
      assert.equal(parseReferrerSource("https://www.linkedin.com/feed/"), "LinkedIn");
      assert.equal(parseReferrerSource(""), "Direct");
      assert.equal(parseReferrerSource(null), "Direct");
      assert.equal(parseReferrerSource("https://mysite.com/page", "mysite.com"), "Direct");
    });
  });

  describe("Date Range Parser", () => {
    it("computes 7-day range and prior baseline window correctly", () => {
      const range = parseDateRange({ period: "7d" });
      assert.ok(range.from);
      assert.ok(range.to);
      assert.ok(range.priorFrom);
      assert.ok(range.priorTo);

      const fromTime = new Date(range.from).getTime();
      const toTime = new Date(range.to).getTime();
      const priorFromTime = new Date(range.priorFrom).getTime();
      const priorToTime = new Date(range.priorTo).getTime();

      // Current duration equals prior duration
      const currDuration = toTime - fromTime;
      const priorDuration = priorToTime - priorFromTime;
      assert.equal(currDuration, priorDuration);
      assert.equal(priorToTime, fromTime);
    });

    it("handles today and yesterday boundaries", () => {
      const today = parseDateRange({ period: "today" });
      assert.ok(today.from <= today.to);

      const yesterday = parseDateRange({ period: "yesterday" });
      assert.ok(yesterday.from <= yesterday.to);
      assert.ok(yesterday.to < new Date().toISOString());
    });
  });

  describe("RecordVisitorEventUseCase", () => {
    it("records a valid pageview event associated with project ID", async () => {
      let recordedEvent = null;

      const mockRepo = {
        findConfigByTrackingKey: async (key) => {
          if (key === "shv_trk_valid") {
            return {
              projectId: "proj-alpha",
              organizationId: "org-1",
              isEnabled: true,
              allowedDomains: [],
            };
          }
          return null;
        },
        recordEvent: async (event) => {
          recordedEvent = event;
          return { id: "evt-123" };
        },
      };

      const useCase = new RecordVisitorEventUseCase({
        projectAnalyticsRepository: mockRepo,
      });

      const result = await useCase.execute({
        trackingKey: "shv_trk_valid",
        eventType: "pageview",
        visitorId: "vis-101",
        sessionId: "sess-202",
        pagePath: "/pricing?utm_source=google&token=supersecret123",
        pageTitle: "Pricing - Shaivik AI",
        referrer: "https://www.google.com/",
        durationSeconds: 15,
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      });

      assert.equal(result.recorded, true);
      assert.equal(result.eventId, "evt-123");
      assert.equal(recordedEvent.projectId, "proj-alpha");
      assert.equal(recordedEvent.organizationId, "org-1");
      assert.equal(recordedEvent.visitorId, "vis-101");
      assert.equal(recordedEvent.sessionId, "sess-202");
      assert.equal(recordedEvent.referrerSource, "Google");
      assert.equal(recordedEvent.deviceCategory, "desktop");
      assert.equal(recordedEvent.browser, "Chrome");
      assert.equal(recordedEvent.os, "macOS");
      assert.equal(recordedEvent.durationSeconds, 15);

      // Sensitive token must be redacted from URL path
      assert.match(recordedEvent.pagePath, /redacted/);
      assert.doesNotMatch(recordedEvent.pagePath, /supersecret123/);
    });

    it("records a valid event using Shaivik Technologies tracking key shv_trk_f9dd72484d5628a271c4f306", async () => {
      let savedEvent = null;
      const mockRepo = {
        findConfigByTrackingKey: async (key) => {
          if (key === "shv_trk_f9dd72484d5628a271c4f306") {
            return {
              projectId: "a3a796ff-8c63-4e6e-8a72-6e6b9dcad114",
              organizationId: "5e62e09b-8bf7-41ab-a13c-e0bfa70e0192",
              isEnabled: true,
              allowedDomains: [],
            };
          }
          return null;
        },
        recordEvent: async (event) => {
          savedEvent = event;
          return { id: "evt-prod-100" };
        },
      };

      const useCase = new RecordVisitorEventUseCase({
        projectAnalyticsRepository: mockRepo,
      });

      const res = await useCase.execute({
        trackingKey: "shv_trk_f9dd72484d5628a271c4f306",
        eventType: "pageview",
        visitorId: "vis-shv-1",
        sessionId: "sess-shv-1",
        pagePath: "/services/ai-solutions",
        pageTitle: "AI Solutions - Shaivik Technologies",
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      });

      assert.equal(res.recorded, true);
      assert.equal(res.eventId, "evt-prod-100");
      assert.equal(savedEvent.projectId, "a3a796ff-8c63-4e6e-8a72-6e6b9dcad114");
      assert.equal(savedEvent.pagePath, "/services/ai-solutions");
      assert.equal(savedEvent.browser, "Chrome");
      assert.equal(savedEvent.deviceCategory, "desktop");
    });

    it("generates fallback anonymous visitor and session IDs when omitted", async () => {
      let savedEvent = null;
      const mockRepo = {
        findConfigByTrackingKey: async () => ({
          projectId: "proj-1",
          organizationId: "org-1",
          isEnabled: true,
        }),
        recordEvent: async (evt) => {
          savedEvent = evt;
          return { id: "evt-fallback" };
        },
      };

      const useCase = new RecordVisitorEventUseCase({
        projectAnalyticsRepository: mockRepo,
      });

      const res = await useCase.execute({
        trackingKey: "shv_trk_valid",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
      });

      assert.equal(res.recorded, true);
      assert.ok(savedEvent.visitorId.startsWith("vid_"));
      assert.ok(savedEvent.sessionId.startsWith("sid_"));
      assert.equal(savedEvent.deviceCategory, "mobile");
    });

    it("returns recorded: false when tracking is disabled for project", async () => {
      let recordCalled = false;
      const mockRepo = {
        findConfigByTrackingKey: async () => ({
          projectId: "proj-disabled",
          organizationId: "org-1",
          isEnabled: false,
        }),
        recordEvent: async () => {
          recordCalled = true;
        },
      };

      const useCase = new RecordVisitorEventUseCase({
        projectAnalyticsRepository: mockRepo,
      });

      const res = await useCase.execute({
        trackingKey: "shv_trk_disabled",
        visitorId: "vis-1",
        sessionId: "sess-1",
      });

      assert.equal(res.recorded, false);
      assert.equal(res.reason, "Tracking is disabled for this project.");
      assert.equal(recordCalled, false);
    });

    it("rejects unknown or invalid tracking keys with TRACKING_CONFIG_NOT_FOUND", async () => {
      const mockRepo = {
        findConfigByTrackingKey: async () => null,
      };

      const useCase = new RecordVisitorEventUseCase({
        projectAnalyticsRepository: mockRepo,
      });

      await assert.rejects(
        async () => {
          await useCase.execute({
            trackingKey: "shv_trk_unknown_project",
            visitorId: "vis-1",
            sessionId: "sess-1",
            pagePath: "/",
          });
        },
        (err) => err.statusCode === 404 && err.errorCode === "TRACKING_CONFIG_NOT_FOUND",
      );
    });

    it("filters out bots without creating database records", async () => {
      let recordCalled = false;
      const mockRepo = {
        findConfigByTrackingKey: async () => ({
          projectId: "proj-1",
          organizationId: "org-1",
          isEnabled: true,
        }),
        recordEvent: async () => {
          recordCalled = true;
          return { id: "evt-bot" };
        },
      };

      const useCase = new RecordVisitorEventUseCase({
        projectAnalyticsRepository: mockRepo,
      });

      const result = await useCase.execute({
        trackingKey: "shv_trk_valid",
        visitorId: "vis-bot",
        sessionId: "sess-bot",
        pagePath: "/",
        userAgent: "Googlebot/2.1 (+http://www.google.com/bot.html)",
      });

      assert.equal(result.recorded, false);
      assert.equal(result.reason, "Bot traffic filtered.");
      assert.equal(recordCalled, false);
    });

    it("safely trims whitespace around tracking keys", async () => {
      let queriedKey = null;
      const mockRepo = {
        findConfigByTrackingKey: async (key) => {
          queriedKey = key;
          return {
            projectId: "a3a796ff-8c63-4e6e-8a72-6e6b9dcad114",
            organizationId: "5e62e09b-8bf7-41ab-a13c-e0bfa70e0192",
            isEnabled: true,
            allowedDomains: [],
          };
        },
        recordEvent: async () => ({ id: "evt-trimmed" }),
      };

      const useCase = new RecordVisitorEventUseCase({
        projectAnalyticsRepository: mockRepo,
      });

      const res = await useCase.execute({
        trackingKey: "  shv_trk_f9dd72484d5628a271c4f306 \n",
        visitorId: "vis-trim",
        sessionId: "sess-trim",
        pagePath: "/",
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      });

      assert.equal(res.recorded, true);
      assert.equal(queriedKey, "shv_trk_f9dd72484d5628a271c4f306");
    });

    it("rejects empty or non-string tracking keys with INVALID_TRACKING_KEY", async () => {
      const mockRepo = {
        findConfigByTrackingKey: async () => null,
      };

      const useCase = new RecordVisitorEventUseCase({
        projectAnalyticsRepository: mockRepo,
      });

      await assert.rejects(
        async () => {
          await useCase.execute({
            trackingKey: "   ",
            visitorId: "vis-1",
            sessionId: "sess-1",
          });
        },
        (err) => err.statusCode === 400 && err.errorCode === "INVALID_TRACKING_KEY",
      );

      await assert.rejects(
        async () => {
          await useCase.execute({
            trackingKey: null,
            visitorId: "vis-1",
            sessionId: "sess-1",
          });
        },
        (err) => err.statusCode === 400 && err.errorCode === "INVALID_TRACKING_KEY",
      );
    });
  });

  describe("Project Isolation & Scoping", () => {
    it("ensures Project A overview returns Project A data only", async () => {
      const projectDataStore = {
        "proj-a": {
          uniqueVisitors: 150,
          sessions: 210,
          pageViews: 600,
          newVisitors: 120,
          returningVisitors: 30,
          avgDurationSeconds: 75,
          bounceRate: 42,
        },
        "proj-b": {
          uniqueVisitors: 12,
          sessions: 15,
          pageViews: 35,
          newVisitors: 10,
          returningVisitors: 2,
          avgDurationSeconds: 30,
          bounceRate: 60,
        },
      };

      const mockRepo = {
        getOverview: async (projectId) => {
          return projectDataStore[projectId] || {
            uniqueVisitors: 0,
            sessions: 0,
            pageViews: 0,
            newVisitors: 0,
            returningVisitors: 0,
            avgDurationSeconds: 0,
            bounceRate: 0,
          };
        },
      };

      const useCase = new GetProjectAnalyticsOverviewUseCase({
        projectAnalyticsRepository: mockRepo,
      });

      const resA = await useCase.execute({ projectId: "proj-a", period: "7d" });
      const resB = await useCase.execute({ projectId: "proj-b", period: "7d" });

      assert.equal(resA.metrics.uniqueVisitors, 150);
      assert.equal(resA.metrics.pageViews, 600);

      assert.equal(resB.metrics.uniqueVisitors, 12);
      assert.equal(resB.metrics.pageViews, 35);

      // Verify no cross-project pollution
      assert.notEqual(resA.metrics.uniqueVisitors, resB.metrics.uniqueVisitors);
    });

    it("manages and rotates project tracking configuration", async () => {
      let storedConfig = {
        projectId: "proj-1",
        organizationId: "org-1",
        trackingKey: "shv_trk_original",
        isEnabled: true,
        allowedDomains: ["shaivik.ai"],
      };

      const mockRepo = {
        findConfigByProjectId: async () => storedConfig,
        updateConfig: async (pid, updates) => {
          storedConfig = { ...storedConfig, ...updates };
          return storedConfig;
        },
        rotateTrackingKey: async () => {
          storedConfig.trackingKey = "shv_trk_new_rotated";
          return storedConfig;
        },
      };

      const getConfigUseCase = new GetProjectTrackingConfigUseCase({
        projectAnalyticsRepository: mockRepo,
        projectRepository: { findById: async () => ({ organizationId: "org-1" }) },
      });

      const updateConfigUseCase = new UpdateProjectTrackingConfigUseCase({
        projectAnalyticsRepository: mockRepo,
      });

      const rotateKeyUseCase = new RotateProjectTrackingKeyUseCase({
        projectAnalyticsRepository: mockRepo,
      });

      const cfg = await getConfigUseCase.execute({ projectId: "proj-1" });
      assert.equal(cfg.trackingKey, "shv_trk_original");
      assert.match(cfg.snippet, /data-project-id="shv_trk_original"/);

      await updateConfigUseCase.execute({
        projectId: "proj-1",
        isEnabled: false,
        allowedDomains: ["test.com"],
      });
      assert.equal(storedConfig.isEnabled, false);
      assert.deepEqual(storedConfig.allowedDomains, ["test.com"]);

      const rotated = await rotateKeyUseCase.execute({ projectId: "proj-1" });
      assert.equal(rotated.trackingKey, "shv_trk_new_rotated");

      // Test explicit tracking key update
      await updateConfigUseCase.execute({
        projectId: "proj-1",
        trackingKey: "shv_trk_f9dd72484d5628a271c4f306",
      });
      assert.equal(storedConfig.trackingKey, "shv_trk_f9dd72484d5628a271c4f306");

      // Test format validation rejects invalid keys
      await assert.rejects(
        async () => {
          await updateConfigUseCase.execute({
            projectId: "proj-1",
            trackingKey: "invalid_format_key",
          });
        },
        (err) => err.statusCode === 400 && err.errorCode === "INVALID_TRACKING_KEY_FORMAT",
      );
    });
  });
});
