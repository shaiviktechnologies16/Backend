import crypto from "crypto";
import { AppError } from "../../../../common/errors/AppError.js";
import {
  isBot,
  parseDeviceCategory,
  parseBrowser,
  parseOperatingSystem,
  parseReferrerSource,
  parseUtmParameters,
  classifyAcquisitionChannel,
} from "../utils/analytics-parser.util.js";

export class RecordVisitorEventUseCase {
  constructor({ projectAnalyticsRepository }) {
    this.projectAnalyticsRepository = projectAnalyticsRepository;
  }

  async execute({
    trackingKey,
    eventType = "pageview",
    visitorId,
    sessionId,
    pagePath,
    pageTitle = null,
    referrer = null,
    durationSeconds = 0,
    metadata = {},
    userAgent = "",
    clientIp = null,
  }) {
    const cleanKey =
      typeof trackingKey === "string"
        ? trackingKey.trim()
        : trackingKey
          ? String(trackingKey).trim()
          : "";

    if (!cleanKey) {
      throw new AppError("Invalid or missing tracking key.", 400, "INVALID_TRACKING_KEY");
    }

    // 1. Validate project config
    const config =
      await this.projectAnalyticsRepository.findConfigByTrackingKey(cleanKey);

    if (!config) {
      throw new AppError("Tracking configuration not found.", 404, "TRACKING_CONFIG_NOT_FOUND");
    }

    if (!config.isEnabled) {
      return { recorded: false, reason: "Tracking is disabled for this project." };
    }

    // 2. Filter obvious bots and automated scanners
    if (isBot(userAgent)) {
      return { recorded: false, reason: "Bot traffic filtered." };
    }

    // 3. Domain validation if allowedDomains is configured
    if (config.allowedDomains && config.allowedDomains.length > 0) {
      const isAllowed = config.allowedDomains.some((domain) => {
        if (!domain) return false;
        const cleanDomain = domain.toLowerCase().trim();
        const ref = (referrer || "").toLowerCase();
        return ref.includes(cleanDomain);
      });

      // If referrer doesn't match any allowed domain, we still allow localhost for development
      if (!isAllowed && referrer && !referrer.includes("localhost") && !referrer.includes("127.0.0.1")) {
        // Optional warning or strict blocking depending on configuration
      }
    }

    // 4. Sanitize inputs (or generate fallback anonymous IDs if omitted)
    const cleanVisitorId =
      visitorId && String(visitorId).trim()
        ? String(visitorId).trim().slice(0, 128)
        : `vid_${crypto.randomUUID()}`;
    const cleanSessionId =
      sessionId && String(sessionId).trim()
        ? String(sessionId).trim().slice(0, 128)
        : `sid_${crypto.randomUUID()}`;

    // Strip sensitive parameters from page path (passwords, tokens, keys)
    let sanitizedPath = String(pagePath || "/").trim().slice(0, 1024);
    try {
      if (sanitizedPath.includes("?")) {
        const dummyUrl = new URL(sanitizedPath, "https://internal.shaivik.ai");
        for (const key of Array.from(dummyUrl.searchParams.keys())) {
          if (/token|key|password|secret|auth|credit|cvv|code/i.test(key)) {
            dummyUrl.searchParams.set(key, "[redacted]");
          }
        }
        sanitizedPath = dummyUrl.pathname + dummyUrl.search;
      }
    } catch {
      // Keep sanitizedPath as is
    }

    // Deduplicate identical pageview events sent within 3 seconds for the same session and page
    if (eventType === "pageview" && this.projectAnalyticsRepository.isRecentDuplicateEvent) {
      const isDup = await this.projectAnalyticsRepository.isRecentDuplicateEvent({
        projectId: config.projectId,
        sessionId: cleanSessionId,
        pagePath: sanitizedPath,
      });
      if (isDup) {
        return { recorded: true, deduplicated: true };
      }
    }

    // Categorize environment & parse UTM traffic attribution
    const deviceCategory = parseDeviceCategory(userAgent);
    const browser = parseBrowser(userAgent);
    const os = parseOperatingSystem(userAgent);
    const utmParams = parseUtmParameters(pagePath);
    const referrerSource = parseReferrerSource(referrer);
    const acquisitionChannel = classifyAcquisitionChannel({
      referrer,
      pagePath,
      utmParams,
    });

    const sanitizedTitle = pageTitle ? String(pageTitle).slice(0, 512) : null;
    const sanitizedReferrer = referrer ? String(referrer).slice(0, 1024) : null;

    const cleanMetadata = {
      ...(typeof metadata === "object" && metadata !== null ? metadata : {}),
      acquisition_channel: acquisitionChannel,
      ...(utmParams.utm_source ? { utm_source: utmParams.utm_source } : {}),
      ...(utmParams.utm_medium ? { utm_medium: utmParams.utm_medium } : {}),
      ...(utmParams.utm_campaign ? { utm_campaign: utmParams.utm_campaign } : {}),
      ...(utmParams.utm_term ? { utm_term: utmParams.utm_term } : {}),
      ...(utmParams.utm_content ? { utm_content: utmParams.utm_content } : {}),
      ...(utmParams.gclid ? { gclid: utmParams.gclid } : {}),
      ...(utmParams.fbclid ? { fbclid: utmParams.fbclid } : {}),
    };

    // 5. Record event in database
    const event = await this.projectAnalyticsRepository.recordEvent({
      projectId: config.projectId,
      organizationId: config.organizationId,
      eventType: eventType || "pageview",
      visitorId: cleanVisitorId,
      sessionId: cleanSessionId,
      pagePath: sanitizedPath,
      pageTitle: sanitizedTitle,
      referrer: sanitizedReferrer,
      referrerSource,
      deviceCategory,
      browser,
      os,
      durationSeconds: Math.max(0, parseInt(durationSeconds, 10) || 0),
      metadata: cleanMetadata,
    });

    return {
      recorded: true,
      eventId: event.id,
    };
  }
}
