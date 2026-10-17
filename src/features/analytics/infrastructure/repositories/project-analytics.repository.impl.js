import crypto from "crypto";
import { ProjectAnalyticsRepository } from "../../domain/repositories/project-analytics.repository.js";

export class ProjectAnalyticsRepositoryImpl extends ProjectAnalyticsRepository {
  constructor(dataSource) {
    super();
    this.dataSource = dataSource;
    this.configCache = new Map();
    this.configCacheTtlMs = 60_000;
  }

  // -------------------------------------------------------------
  // CONFIGURATION
  // -------------------------------------------------------------

  async findConfigByProjectId(projectId) {
    const manager = this.dataSource.manager;
    const records = await manager.query(
      `
      SELECT
        id,
        project_id AS "projectId",
        organization_id AS "organizationId",
        tracking_key AS "trackingKey",
        is_enabled AS "isEnabled",
        allowed_domains AS "allowedDomains",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM project_analytics_configs
      WHERE project_id = $1
      LIMIT 1
    `,
      [projectId],
    );

    return records[0] || null;
  }

  async findConfigByTrackingKey(trackingKey) {
    if (!trackingKey) return null;

    const cached = this.configCache.get(trackingKey);
    if (cached && Date.now() - cached.timestamp < this.configCacheTtlMs) {
      return cached.config;
    }

    const manager = this.dataSource.manager;
    const records = await manager.query(
      `
      SELECT
        c.id,
        c.project_id AS "projectId",
        c.organization_id AS "organizationId",
        c.tracking_key AS "trackingKey",
        c.is_enabled AS "isEnabled",
        c.allowed_domains AS "allowedDomains",
        p.name AS "projectName",
        p.status AS "projectStatus"
      FROM project_analytics_configs c
      INNER JOIN projects p ON p.id = c.project_id
      WHERE c.tracking_key = $1
        AND p.deleted_at IS NULL
      LIMIT 1
    `,
      [trackingKey],
    );

    const config = records[0] || null;
    if (config) {
      this.configCache.set(trackingKey, {
        config,
        timestamp: Date.now(),
      });
    }

    return config;
  }

  async createConfig({
    projectId,
    organizationId,
    trackingKey = null,
    allowedDomains = [],
  }) {
    const key = trackingKey || `shv_trk_${crypto.randomBytes(12).toString("hex")}`;
    const manager = this.dataSource.manager;

    const records = await manager.query(
      `
      INSERT INTO project_analytics_configs (
        project_id,
        organization_id,
        tracking_key,
        allowed_domains,
        is_enabled
      )
      VALUES ($1, $2, $3, $4, true)
      ON CONFLICT (project_id) DO UPDATE
      SET updated_at = CURRENT_TIMESTAMP
      RETURNING
        id,
        project_id AS "projectId",
        organization_id AS "organizationId",
        tracking_key AS "trackingKey",
        is_enabled AS "isEnabled",
        allowed_domains AS "allowedDomains",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
      [projectId, organizationId, key, allowedDomains],
    );

    this.configCache.delete(key);
    return records[0];
  }

  async updateConfig(projectId, { isEnabled, allowedDomains }) {
    const manager = this.dataSource.manager;
    const fields = [];
    const values = [projectId];
    let idx = 2;

    if (typeof isEnabled === "boolean") {
      fields.push(`is_enabled = $${idx++}`);
      values.push(isEnabled);
    }

    if (Array.isArray(allowedDomains)) {
      fields.push(`allowed_domains = $${idx++}`);
      values.push(allowedDomains);
    }

    fields.push("updated_at = CURRENT_TIMESTAMP");

    const records = await manager.query(
      `
      UPDATE project_analytics_configs
      SET ${fields.join(", ")}
      WHERE project_id = $1
      RETURNING
        id,
        project_id AS "projectId",
        organization_id AS "organizationId",
        tracking_key AS "trackingKey",
        is_enabled AS "isEnabled",
        allowed_domains AS "allowedDomains",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
      values,
    );

    if (records[0]?.trackingKey) {
      this.configCache.delete(records[0].trackingKey);
    }

    return records[0] || null;
  }

  async rotateTrackingKey(projectId) {
    const manager = this.dataSource.manager;
    const newKey = `shv_trk_${crypto.randomBytes(12).toString("hex")}`;

    const records = await manager.query(
      `
      UPDATE project_analytics_configs
      SET tracking_key = $2, updated_at = CURRENT_TIMESTAMP
      WHERE project_id = $1
      RETURNING
        id,
        project_id AS "projectId",
        organization_id AS "organizationId",
        tracking_key AS "trackingKey",
        is_enabled AS "isEnabled",
        allowed_domains AS "allowedDomains",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
      [projectId, newKey],
    );

    this.configCache.clear();
    return records[0] || null;
  }

  // -------------------------------------------------------------
  // EVENT INGESTION
  // -------------------------------------------------------------

  async recordEvent({
    projectId,
    organizationId,
    eventType = "pageview",
    visitorId,
    sessionId,
    pagePath,
    pageTitle = null,
    referrer = null,
    referrerSource = "Direct",
    deviceCategory = "desktop",
    browser = "Other",
    os = "Other",
    country = null,
    durationSeconds = 0,
    metadata = {},
  }) {
    const manager = this.dataSource.manager;

    // Check if visitor is new to this project
    const prior = await manager.query(
      `
      SELECT 1 FROM project_visitor_events
      WHERE project_id = $1 AND visitor_id = $2
      LIMIT 1
    `,
      [projectId, visitorId],
    );
    const isNewVisitor = prior.length === 0;

    const result = await manager.query(
      `
      INSERT INTO project_visitor_events (
        project_id,
        organization_id,
        event_type,
        visitor_id,
        session_id,
        page_path,
        page_title,
        referrer,
        referrer_source,
        device_category,
        browser,
        os,
        country,
        duration_seconds,
        is_new_visitor,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id, created_at AS "createdAt"
    `,
      [
        projectId,
        organizationId,
        eventType,
        visitorId,
        sessionId,
        pagePath,
        pageTitle,
        referrer,
        referrerSource,
        deviceCategory,
        browser,
        os,
        country,
        Math.max(0, Number(durationSeconds) || 0),
        isNewVisitor,
        JSON.stringify(metadata || {}),
      ],
    );

    return result[0];
  }

  // -------------------------------------------------------------
  // AGGREGATIONS & DASHBOARD QUERIES
  // -------------------------------------------------------------

  async getOverview(projectId, { from, to, priorFrom, priorTo }) {
    const manager = this.dataSource.manager;

    // Current period metrics
    const [currentMetrics] = await manager.query(
      `
      SELECT
        COUNT(DISTINCT visitor_id)::int AS "uniqueVisitors",
        COUNT(DISTINCT session_id)::int AS "sessions",
        COUNT(*)::int AS "pageViews",
        COALESCE(AVG(duration_seconds), 0)::int AS "avgDurationSeconds"
      FROM project_visitor_events
      WHERE project_id = $1
        AND created_at >= $2
        AND created_at <= $3
    `,
      [projectId, from, to],
    );

    // New visitors in current period:
    // Visitors whose earliest event in this project falls between $2 and $3
    const [newVisitorsRes] = await manager.query(
      `
      WITH first_events AS (
        SELECT visitor_id, MIN(created_at) AS first_seen
        FROM project_visitor_events
        WHERE project_id = $1
        GROUP BY visitor_id
      )
      SELECT COUNT(*)::int AS "newVisitors"
      FROM first_events
      WHERE first_seen >= $2 AND first_seen <= $3
    `,
      [projectId, from, to],
    );

    // Bounce rate: % of sessions that have only 1 event
    const [bounceRes] = await manager.query(
      `
      WITH session_counts AS (
        SELECT session_id, COUNT(*) as event_count
        FROM project_visitor_events
        WHERE project_id = $1
          AND created_at >= $2
          AND created_at <= $3
        GROUP BY session_id
      )
      SELECT
        COUNT(*)::int AS total_sessions,
        COUNT(*) FILTER (WHERE event_count = 1)::int AS bounced_sessions
      FROM session_counts
    `,
      [projectId, from, to],
    );

    const totalSessions = bounceRes?.total_sessions || 0;
    const bouncedSessions = bounceRes?.bounced_sessions || 0;
    const bounceRate =
      totalSessions > 0
        ? Math.round((bouncedSessions / totalSessions) * 100)
        : 0;

    const uniqueVisitors = currentMetrics?.uniqueVisitors || 0;
    const newVisitors = newVisitorsRes?.newVisitors || 0;
    const returningVisitors = Math.max(0, uniqueVisitors - newVisitors);

    // Prior period metrics (for percentage change comparisons)
    let priorMetrics = null;
    if (priorFrom && priorTo) {
      const [res] = await manager.query(
        `
        SELECT
          COUNT(DISTINCT visitor_id)::int AS "uniqueVisitors",
          COUNT(DISTINCT session_id)::int AS "sessions",
          COUNT(*)::int AS "pageViews"
        FROM project_visitor_events
        WHERE project_id = $1
          AND created_at >= $2
          AND created_at <= $3
      `,
        [projectId, priorFrom, priorTo],
      );

      const [priorNewRes] = await manager.query(
        `
        WITH first_events AS (
          SELECT visitor_id, MIN(created_at) AS first_seen
          FROM project_visitor_events
          WHERE project_id = $1
          GROUP BY visitor_id
        )
        SELECT COUNT(*)::int AS "newVisitors"
        FROM first_events
        WHERE first_seen >= $2 AND first_seen <= $3
      `,
        [projectId, priorFrom, priorTo],
      );

      priorMetrics = {
        uniqueVisitors: res?.uniqueVisitors || 0,
        sessions: res?.sessions || 0,
        pageViews: res?.pageViews || 0,
        newVisitors: priorNewRes?.newVisitors || 0,
      };
    }

    const calcChange = (curr, prev) => {
      if (prev === null || prev === undefined || prev === 0) return null;
      return Math.round(((curr - prev) / prev) * 100);
    };

    return {
      uniqueVisitors,
      sessions: currentMetrics?.sessions || 0,
      pageViews: currentMetrics?.pageViews || 0,
      newVisitors,
      returningVisitors,
      avgDurationSeconds: currentMetrics?.avgDurationSeconds || 0,
      bounceRate,
      changes: priorMetrics
        ? {
            uniqueVisitors: calcChange(uniqueVisitors, priorMetrics.uniqueVisitors),
            sessions: calcChange(currentMetrics?.sessions || 0, priorMetrics.sessions),
            pageViews: calcChange(currentMetrics?.pageViews || 0, priorMetrics.pageViews),
            newVisitors: calcChange(newVisitors, priorMetrics.newVisitors),
          }
        : null,
    };
  }

  async getTrends(projectId, { from, to, timezone = "UTC" }) {
    const manager = this.dataSource.manager;

    const rows = await manager.query(
      `
      SELECT
        TO_CHAR(created_at AT TIME ZONE $4, 'YYYY-MM-DD') AS "date",
        COUNT(DISTINCT visitor_id)::int AS "visitors",
        COUNT(DISTINCT session_id)::int AS "sessions",
        COUNT(*)::int AS "pageViews"
      FROM project_visitor_events
      WHERE project_id = $1
        AND created_at >= $2
        AND created_at <= $3
      GROUP BY 1
      ORDER BY 1 ASC
    `,
      [projectId, from, to, timezone],
    );

    return rows.map((r) => ({
      date: r.date,
      visitors: Number(r.visitors) || 0,
      sessions: Number(r.sessions) || 0,
      pageViews: Number(r.pageViews) || 0,
    }));
  }

  async getPopularPages(projectId, { from, to, limit = 10 }) {
    const manager = this.dataSource.manager;

    const rows = await manager.query(
      `
      SELECT
        page_path AS "path",
        COALESCE(MAX(page_title), page_path) AS "title",
        COUNT(*)::int AS "views",
        COUNT(DISTINCT visitor_id)::int AS "visitors",
        COALESCE(AVG(duration_seconds), 0)::int AS "avgDurationSeconds"
      FROM project_visitor_events
      WHERE project_id = $1
        AND created_at >= $2
        AND created_at <= $3
      GROUP BY page_path
      ORDER BY "views" DESC
      LIMIT $4
    `,
      [projectId, from, to, Math.min(50, Math.max(1, limit))],
    );

    return rows;
  }

  async getTrafficSources(projectId, { from, to, limit = 10 }) {
    const manager = this.dataSource.manager;

    const rows = await manager.query(
      `
      SELECT
        COALESCE(referrer_source, 'Direct') AS "source",
        COUNT(*)::int AS "views",
        COUNT(DISTINCT visitor_id)::int AS "visitors"
      FROM project_visitor_events
      WHERE project_id = $1
        AND created_at >= $2
        AND created_at <= $3
      GROUP BY COALESCE(referrer_source, 'Direct')
      ORDER BY "views" DESC
      LIMIT $4
    `,
      [projectId, from, to, Math.min(50, Math.max(1, limit))],
    );

    const totalViews = rows.reduce((acc, r) => acc + r.views, 0);

    return rows.map((r) => ({
      source: r.source,
      views: r.views,
      visitors: r.visitors,
      percentage: totalViews > 0 ? Math.round((r.views / totalViews) * 100) : 0,
    }));
  }

  async getDeviceBreakdown(projectId, { from, to }) {
    const manager = this.dataSource.manager;

    const [devices, browsers, os] = await Promise.all([
      manager.query(
        `
        SELECT
          COALESCE(device_category, 'desktop') AS "name",
          COUNT(*)::int AS "count"
        FROM project_visitor_events
        WHERE project_id = $1
          AND created_at >= $2
          AND created_at <= $3
        GROUP BY 1
        ORDER BY 2 DESC
      `,
        [projectId, from, to],
      ),

      manager.query(
        `
        SELECT
          COALESCE(browser, 'Other') AS "name",
          COUNT(*)::int AS "count"
        FROM project_visitor_events
        WHERE project_id = $1
          AND created_at >= $2
          AND created_at <= $3
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 6
      `,
        [projectId, from, to],
      ),

      manager.query(
        `
        SELECT
          COALESCE(os, 'Other') AS "name",
          COUNT(*)::int AS "count"
        FROM project_visitor_events
        WHERE project_id = $1
          AND created_at >= $2
          AND created_at <= $3
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 6
      `,
        [projectId, from, to],
      ),
    ]);

    return {
      devices,
      browsers,
      os,
    };
  }

  async getChatbotAnalytics(projectId, { from, to, timezone = "UTC" }) {
    const manager = this.dataSource.manager;

    // Chatbot conversations and user messages
    const [convRes] = await manager.query(
      `
      SELECT COUNT(*)::int AS "conversationsStarted"
      FROM conversations
      WHERE project_id = $1
        AND created_at >= $2
        AND created_at <= $3
    `,
      [projectId, from, to],
    );

    const [msgRes] = await manager.query(
      `
      SELECT COUNT(m.id)::int AS "userMessages"
      FROM messages m
      INNER JOIN conversations c ON m.conversation_id = c.id
      WHERE c.project_id = $1
        AND m.role = 'user'
        AND m.created_at >= $2
        AND m.created_at <= $3
    `,
      [projectId, from, to],
    );

    // AI Usage success, failure & response time
    const [usageRes] = await manager.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE u.status = 'SUCCESS')::int AS "successfulResponses",
        COUNT(*) FILTER (WHERE u.status != 'SUCCESS')::int AS "failedResponses",
        COALESCE(AVG(u.response_time_ms), 0)::int AS "averageResponseTimeMs"
      FROM usage u
      INNER JOIN conversations c ON u.conversation_id = c.id
      WHERE c.project_id = $1
        AND u.created_at >= $2
        AND u.created_at <= $3
    `,
      [projectId, from, to],
    );

    const successful = usageRes?.successfulResponses || 0;
    const failed = usageRes?.failedResponses || 0;
    const totalAiResponses = successful + failed;
    const successRate =
      totalAiResponses > 0
        ? Math.round((successful / totalAiResponses) * 100)
        : 100;

    // Chatbot daily engagement trends
    const trends = await manager.query(
      `
      WITH daily_convs AS (
        SELECT
          TO_CHAR(created_at AT TIME ZONE $4, 'YYYY-MM-DD') AS "date",
          COUNT(*)::int AS conv_count
        FROM conversations
        WHERE project_id = $1
          AND created_at >= $2
          AND created_at <= $3
        GROUP BY 1
      ),
      daily_msgs AS (
        SELECT
          TO_CHAR(m.created_at AT TIME ZONE $4, 'YYYY-MM-DD') AS "date",
          COUNT(*)::int AS msg_count
        FROM messages m
        INNER JOIN conversations c ON m.conversation_id = c.id
        WHERE c.project_id = $1
          AND m.role = 'user'
          AND m.created_at >= $2
          AND m.created_at <= $3
        GROUP BY 1
      )
      SELECT
        COALESCE(c.date, m.date) AS "date",
        COALESCE(c.conv_count, 0)::int AS "conversations",
        COALESCE(m.msg_count, 0)::int AS "messages"
      FROM daily_convs c
      FULL OUTER JOIN daily_msgs m ON c.date = m.date
      ORDER BY 1 ASC
    `,
      [projectId, from, to, timezone],
    );

    return {
      conversationsStarted: convRes?.conversationsStarted || 0,
      totalUserMessages: msgRes?.userMessages || 0,
      successfulResponses: successful,
      failedResponses: failed,
      successRate,
      averageResponseTimeMs: usageRes?.averageResponseTimeMs || 0,
      trends: trends.map((t) => ({
        date: t.date,
        conversations: t.conversations,
        messages: t.messages,
      })),
    };
  }
}

