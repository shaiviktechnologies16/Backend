export class PublicAnalyticsController {
  constructor({ recordVisitorEventUseCase }) {
    this.recordVisitorEventUseCase = recordVisitorEventUseCase;
  }

  recordEvent = async (req, res, next) => {
    try {
      let payload = req.body;

      // Handle navigator.sendBeacon where body might be raw text/json
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch {
          payload = {};
        }
      }

      const userAgent = req.headers["user-agent"] || "";
      const referrer = req.headers["referer"] || req.headers["referrer"] || payload.referrer || "";
      const clientIp =
        req.headers["cf-connecting-ip"] ||
        req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.socket?.remoteAddress;

      const rawKey =
        payload.trackingKey ||
        payload.tracking_key ||
        payload.projectId ||
        payload.project_id ||
        payload.trackingId ||
        payload.tracking_id;
      const trackingKey =
        typeof rawKey === "string"
          ? rawKey.trim()
          : rawKey
            ? String(rawKey).trim()
            : "";

      const result = await this.recordVisitorEventUseCase.execute({
        trackingKey,
        eventType: payload.eventType || payload.event || "pageview",
        visitorId: payload.visitorId,
        sessionId: payload.sessionId,
        pagePath: payload.pagePath || payload.path || "/",
        pageTitle: payload.pageTitle || payload.title,
        referrer,
        durationSeconds: payload.durationSeconds || 0,
        metadata: payload.metadata || {},
        userAgent,
        clientIp,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      // In public tracking, we log warning and return safe 200 or 400 without crashing client websites
      if (error.statusCode === 400 || error.statusCode === 404) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.errorCode || "TRACKING_ERROR",
        });
      }
      next(error);
    }
  };
}

