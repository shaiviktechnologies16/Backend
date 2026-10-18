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
    const cleanKey =
      typeof trackingKey === "string"
        ? trackingKey.trim()
        : String(trackingKey).trim();
    if (!cleanKey) return null;

    const cached = this.configCache.get(cleanKey);
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
      WHERE (TRIM(c.tracking_key) = $1 OR c.project_id::text = $1)
        AND p.deleted_at IS NULL
      LIMIT 1
    `,
      [cleanKey],
    );

    const config = records[0] || null;
    if (config) {
      this.configCache.set(cleanKey, {
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
      SET tracking_key = COALESCE(EXCLUDED.tracking_key, project_analytics_configs.tracking_key),
          allowed_domains = CASE 
            WHEN array_length(EXCLUDED.allowed_domains, 1) > 0 THEN EXCLUDED.allowed_domains 
            ELSE project_analytics_configs.allowed_domains 
          END,
          updated_at = CURRENT_TIMESTAMP
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

    this.configCache.clear();
    return records[0];
  }

  async updateConfig(projectId, { isEnabled, allowedDomains, trackingKey }) {
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

    if (trackingKey && typeof trackingKey === "string") {
      fields.push(`tracking_key = $${idx++}`);
      values.push(trackingKey.trim());
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

    this.configCache.clear();
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
      WITH session_durations AS (
        SELECT session_id, COALESCE(MAX(duration_seconds), 0) AS dur
        FROM project_visitor_events
        WHERE project_id = $1
          AND created_at >= $2
          AND created_at <= $3
        GROUP BY session_id
      )
      SELECT
        (SELECT COUNT(DISTINCT visitor_id)::int FROM project_visitor_events WHERE project_id = $1 AND created_at >= $2 AND created_at <= $3) AS "uniqueVisitors",
        (SELECT COUNT(DISTINCT session_id)::int FROM project_visitor_events WHERE project_id = $1 AND created_at >= $2 AND created_at <= $3) AS "sessions",
        (SELECT COUNT(*)::int FROM project_visitor_events WHERE project_id = $1 AND created_at >= $2 AND created_at <= $3 AND event_type = 'pageview') AS "pageViews",
        COALESCE((SELECT AVG(dur)::int FROM session_durations), 0) AS "avgDurationSeconds"
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

  async isRecentDuplicateEvent({ projectId, sessionId, pagePath }) {
    const manager = this.dataSource.manager;
    const res = await manager.query(
      `
      SELECT 1 FROM project_visitor_events
      WHERE project_id = $1
        AND session_id = $2
        AND page_path = $3
        AND event_type = 'pageview'
        AND created_at >= NOW() - INTERVAL '3 seconds'
      LIMIT 1
    `,
      [projectId, sessionId, pagePath],
    );
    return res.length > 0;
  }

  async getLandingPages(projectId, { from, to, limit = 10 }) {
    const manager = this.dataSource.manager;
    const rows = await manager.query(
      `
      WITH session_landings AS (
        SELECT DISTINCT ON (session_id)
          session_id,
          page_path,
          COALESCE(page_title, page_path) AS page_title,
          created_at
        FROM project_visitor_events
        WHERE project_id = $1
          AND created_at >= $2
          AND created_at <= $3
        ORDER BY session_id, created_at ASC
      ),
      session_stats AS (
        SELECT
          session_id,
          COUNT(*) AS event_count,
          COALESCE(MAX(duration_seconds), 0) AS duration
        FROM project_visitor_events
        WHERE project_id = $1
          AND created_at >= $2
          AND created_at <= $3
        GROUP BY session_id
      )
      SELECT
        sl.page_path AS "path",
        sl.page_title AS "title",
        COUNT(sl.session_id)::int AS "sessions",
        COUNT(sl.session_id) FILTER (WHERE ss.event_count = 1)::int AS "bounces",
        ROUND((COUNT(sl.session_id) FILTER (WHERE ss.event_count = 1)::numeric / NULLIF(COUNT(sl.session_id), 0)) * 100)::int AS "bounceRate",
        COALESCE(AVG(ss.duration), 0)::int AS "avgDurationSeconds"
      FROM session_landings sl
      JOIN session_stats ss ON sl.session_id = ss.session_id
      GROUP BY sl.page_path, sl.page_title
      ORDER BY "sessions" DESC
      LIMIT $4
    `,
      [projectId, from, to, Math.min(50, Math.max(1, limit))],
    );
    return rows;
  }

  async getCampaigns(projectId, { from, to, limit = 10 }) {
    const manager = this.dataSource.manager;
    const rows = await manager.query(
      `
      SELECT
        COALESCE(metadata->>'utm_campaign', 'None') AS "campaign",
        COALESCE(metadata->>'utm_source', referrer_source, 'Direct') AS "source",
        COALESCE(metadata->>'utm_medium', 'Direct') AS "medium",
        COUNT(DISTINCT visitor_id)::int AS "visitors",
        COUNT(DISTINCT session_id)::int AS "sessions",
        COUNT(*)::int AS "views"
      FROM project_visitor_events
      WHERE project_id = $1
        AND created_at >= $2
        AND created_at <= $3
      GROUP BY 1, 2, 3
      ORDER BY "views" DESC
      LIMIT $4
    `,
      [projectId, from, to, Math.min(50, Math.max(1, limit))],
    );
    return rows;
  }

  async getVisitors(projectId, { from, to, page = 1, limit = 20, search = "" }) {
    const manager = this.dataSource.manager;
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (parsedPage - 1) * parsedLimit;

    const searchCondition =
      search && typeof search === "string" && search.trim()
        ? `AND (visitor_id ILIKE $4 OR referrer_source ILIKE $4 OR page_path ILIKE $4)`
        : "";

    const queryParams = [projectId, from, to];
    if (searchCondition) {
      queryParams.push(`%${search.trim()}%`);
    }

    const [countRes] = await manager.query(
      `
      SELECT COUNT(DISTINCT visitor_id)::int AS total
      FROM project_visitor_events
      WHERE project_id = $1
        AND created_at >= $2
        AND created_at <= $3
        ${searchCondition}
    `,
      queryParams,
    );

    const total = countRes?.total || 0;
    const totalPages = Math.ceil(total / parsedLimit);

    const paginationParams = [...queryParams, parsedLimit, offset];
    const limitIdx = queryParams.length + 1;
    const offsetIdx = queryParams.length + 2;

    const rows = await manager.query(
      `
      WITH visitor_metrics AS (
        SELECT
          visitor_id,
          MIN(created_at) AS first_seen_at,
          MAX(created_at) AS last_seen_at,
          COUNT(DISTINCT session_id)::int AS total_sessions,
          COUNT(*) FILTER (WHERE event_type = 'pageview')::int AS total_page_views
        FROM project_visitor_events
        WHERE project_id = $1
          AND created_at >= $2
          AND created_at <= $3
          ${searchCondition}
        GROUP BY visitor_id
      ),
      first_visits AS (
        SELECT DISTINCT ON (visitor_id)
          visitor_id,
          page_path AS first_landing_page,
          COALESCE(referrer_source, 'Direct') AS original_source,
          metadata->>'utm_campaign' AS original_campaign
        FROM project_visitor_events
        WHERE project_id = $1
        ORDER BY visitor_id, created_at ASC
      )
      SELECT
        vm.visitor_id AS "visitorId",
        vm.first_seen_at AS "firstSeenAt",
        vm.last_seen_at AS "lastSeenAt",
        vm.total_sessions AS "totalSessions",
        vm.total_page_views AS "totalPageViews",
        fv.first_landing_page AS "firstLandingPage",
        fv.original_source AS "originalSource",
        fv.original_campaign AS "originalCampaign"
      FROM visitor_metrics vm
      JOIN first_visits fv ON vm.visitor_id = fv.visitor_id
      ORDER BY vm.last_seen_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `,
      paginationParams,
    );

    return {
      visitors: rows,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages,
      },
    };
  }

  async getVisitorDetails(projectId, visitorId) {
    const manager = this.dataSource.manager;

    const [visitorSummary] = await manager.query(
      `
      SELECT
        visitor_id AS "visitorId",
        MIN(created_at) AS "firstSeenAt",
        MAX(created_at) AS "lastSeenAt",
        COUNT(DISTINCT session_id)::int AS "totalSessions",
        COUNT(*) FILTER (WHERE event_type = 'pageview')::int AS "totalPageViews",
        (ARRAY_AGG(page_path ORDER BY created_at ASC))[1] AS "firstLandingPage",
        COALESCE((ARRAY_AGG(referrer_source ORDER BY created_at ASC))[1], 'Direct') AS "originalSource",
        (ARRAY_AGG(metadata->>'utm_campaign' ORDER BY created_at ASC))[1] AS "originalCampaign"
      FROM project_visitor_events
      WHERE project_id = $1 AND visitor_id = $2
      GROUP BY visitor_id
    `,
      [projectId, visitorId],
    );

    if (!visitorSummary) {
      return null;
    }

    const sessions = await manager.query(
      `
      SELECT
        session_id AS "sessionId",
        MIN(created_at) AS "startedAt",
        MAX(created_at) AS "endedAt",
        COALESCE(MAX(duration_seconds), 0)::int AS "durationSeconds",
        COUNT(*) FILTER (WHERE event_type = 'pageview')::int AS "pageViewCount",
        (ARRAY_AGG(page_path ORDER BY created_at ASC))[1] AS "landingPage",
        COALESCE((ARRAY_AGG(referrer_source ORDER BY created_at ASC))[1], 'Direct') AS "source",
        (ARRAY_AGG(metadata->>'utm_campaign' ORDER BY created_at ASC))[1] AS "campaign",
        COALESCE(MAX(device_category), 'desktop') AS "deviceCategory",
        COALESCE(MAX(browser), 'Other') AS "browser",
        COALESCE(MAX(os), 'Other') AS "os"
      FROM project_visitor_events
      WHERE project_id = $1 AND visitor_id = $2
      GROUP BY session_id
      ORDER BY "startedAt" DESC
    `,
      [projectId, visitorId],
    );

    const events = await manager.query(
      `
      SELECT
        id,
        session_id AS "sessionId",
        event_type AS "eventType",
        page_path AS "pagePath",
        page_title AS "pageTitle",
        referrer,
        referrer_source AS "referrerSource",
        duration_seconds AS "durationSeconds",
        metadata,
        created_at AS "createdAt"
      FROM project_visitor_events
      WHERE project_id = $1 AND visitor_id = $2
      ORDER BY created_at ASC
    `,
      [projectId, visitorId],
    );

    // Group events by session
    const eventsBySession = new Map();
    for (const ev of events) {
      if (!eventsBySession.has(ev.sessionId)) {
        eventsBySession.set(ev.sessionId, []);
      }
      eventsBySession.get(ev.sessionId).push(ev);
    }

    const enrichedSessions = sessions.map((sess) => ({
      ...sess,
      events: eventsBySession.get(sess.sessionId) || [],
    }));

    return {
      ...visitorSummary,
      sessions: enrichedSessions,
    };
  }
}

