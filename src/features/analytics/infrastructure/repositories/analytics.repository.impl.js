import { AnalyticsRepository } from "../../domain/repositories/analytics.repository.js";

export class AnalyticsRepositoryImpl extends AnalyticsRepository {
  constructor(dataSource = AppDataSource) {
    super();
    this.dataSource = dataSource;
  }

  async getOverview(scope) {
    const manager = this.dataSource.manager;

    if (scope.type === "PLATFORM") {
      const counts = await manager.query(`
        SELECT
          (SELECT COUNT(*)::int FROM organizations WHERE deleted_at IS NULL) AS organizations,
          (SELECT COUNT(*)::int FROM users WHERE is_active = true) AS users,
          (SELECT COUNT(*)::int FROM projects WHERE deleted_at IS NULL) AS projects,
          (SELECT COUNT(*)::int FROM agents) AS agents,
          (SELECT COUNT(*)::int FROM conversations) AS conversations,
          (SELECT COUNT(*)::int FROM messages) AS messages,
          (SELECT COUNT(DISTINCT user_id)::int FROM conversations WHERE user_id IS NOT NULL) AS "activeUsers"
      `);

      const usage = await manager.query(`
        SELECT
          COUNT(*)::int AS requests,
          COALESCE(SUM(input_tokens), 0)::int AS "inputTokens",
          COALESCE(SUM(output_tokens), 0)::int AS "outputTokens",
          COALESCE(SUM(total_tokens), 0)::int AS "totalTokens",
          COALESCE(AVG(response_time_ms), 0)::int AS "averageResponseTimeMs"
        FROM usage
        WHERE status = 'SUCCESS'
      `);

      const c = counts[0] || {};
      const u = usage[0] || {};

      return {
        organizations: c.organizations ?? 0,
        users: c.users ?? 0,
        projects: c.projects ?? 0,
        agents: c.agents ?? 0,
        conversations: c.conversations ?? 0,
        messages: c.messages ?? 0,
        activeUsers: c.activeUsers ?? 0,

        requests: u.requests ?? 0,
        inputTokens: u.inputTokens ?? 0,
        outputTokens: u.outputTokens ?? 0,
        totalTokens: u.totalTokens ?? 0,
        averageResponseTimeMs: u.averageResponseTimeMs ?? 0,
      };
    }

    const organizationId = scope.organizationId;

    const counts = await manager.query(
      `
      SELECT
        (
          SELECT COUNT(*)::int
          FROM projects
          WHERE organization_id = $1
            AND deleted_at IS NULL
        ) AS projects,
        (
          SELECT COUNT(*)::int
          FROM agents a
          INNER JOIN projects p ON p.id = a.project_id
          WHERE p.organization_id = $1
            AND p.deleted_at IS NULL
        ) AS agents,
        (
          SELECT COUNT(*)::int
          FROM conversations c
          INNER JOIN projects p ON p.id = c.project_id
          WHERE p.organization_id = $1
            AND p.deleted_at IS NULL
        ) AS conversations,
        (
          SELECT COUNT(*)::int
          FROM messages m
          INNER JOIN conversations c ON c.id = m.conversation_id
          INNER JOIN projects p ON p.id = c.project_id
          WHERE p.organization_id = $1
            AND p.deleted_at IS NULL
        ) AS messages,
        (
          SELECT COUNT(DISTINCT c.user_id)::int
          FROM conversations c
          INNER JOIN projects p ON p.id = c.project_id
          WHERE p.organization_id = $1
            AND p.deleted_at IS NULL
            AND c.user_id IS NOT NULL
        ) AS "activeUsers"
    `,
      [organizationId],
    );

    const usage = await manager.query(
      `
      SELECT
        COUNT(*)::int AS requests,
        COALESCE(SUM(u.input_tokens), 0)::int AS "inputTokens",
        COALESCE(SUM(u.output_tokens), 0)::int AS "outputTokens",
        COALESCE(SUM(u.total_tokens), 0)::int AS "totalTokens",
        COALESCE(AVG(u.response_time_ms), 0)::int AS "averageResponseTimeMs"
      FROM usage u
      INNER JOIN agents a ON a.id = u.agent_id
      INNER JOIN projects p ON p.id = a.project_id
      WHERE p.organization_id = $1
        AND p.deleted_at IS NULL
        AND u.status = 'SUCCESS'
    `,
      [organizationId],
    );

    const c = counts[0] || {};
    const u = usage[0] || {};

    return {
      projects: c.projects ?? 0,
      agents: c.agents ?? 0,
      conversations: c.conversations ?? 0,
      messages: c.messages ?? 0,
      activeUsers: c.activeUsers ?? 0,

      requests: u.requests ?? 0,
      inputTokens: u.inputTokens ?? 0,
      outputTokens: u.outputTokens ?? 0,
      totalTokens: u.totalTokens ?? 0,
      averageResponseTimeMs: u.averageResponseTimeMs ?? 0,
    };
  }

  async getPlatformActiveUsers() {
    const result = await this.dataSource.manager.query(`
      SELECT COUNT(DISTINCT user_id)::int AS count
      FROM conversations
      WHERE user_id IS NOT NULL
    `);

    return result[0].count;
  }

  async getTrends(scope, { from, to, interval = "day" }) {
    const manager = this.dataSource.manager;

    const dateTrunc =
      {
        hour: "hour",
        day: "day",
        week: "week",
        month: "month",
      }[interval] ?? "day";

    if (scope.type === "PLATFORM") {
      const usage = await manager.query(
        `
        SELECT
          date_trunc('${dateTrunc}', u.created_at) AS date,
          COUNT(*)::int AS requests,
          COALESCE(SUM(u.input_tokens), 0)::int AS "inputTokens",
          COALESCE(SUM(u.output_tokens), 0)::int AS "outputTokens",
          COALESCE(SUM(u.total_tokens), 0)::int AS "totalTokens"
        FROM usage u
        WHERE u.status = 'SUCCESS'
          AND u.created_at >= $1
          AND u.created_at < $2
        GROUP BY 1
        ORDER BY 1
      `,
        [from, to],
      );

      const conversations = await manager.query(
        `
        SELECT
          date_trunc('${dateTrunc}', c.created_at) AS date,
          COUNT(*)::int AS count
        FROM conversations c
        WHERE c.created_at >= $1
          AND c.created_at < $2
        GROUP BY 1
        ORDER BY 1
      `,
        [from, to],
      );

      const activeUsers = await manager.query(
        `
        SELECT
          date_trunc('${dateTrunc}', c.created_at) AS date,
          COUNT(DISTINCT c.user_id)::int AS count
        FROM conversations c
        WHERE c.created_at >= $1
          AND c.created_at < $2
          AND c.user_id IS NOT NULL
        GROUP BY 1
        ORDER BY 1
      `,
        [from, to],
      );

      return {
        usage: usage || [],
        conversations: conversations || [],
        activeUsers: activeUsers || [],
      };
    }

    const organizationId = scope.organizationId;

    const usage = await manager.query(
      `
      SELECT
        date_trunc('${dateTrunc}', u.created_at) AS date,
        COUNT(*)::int AS requests,
        COALESCE(SUM(u.input_tokens), 0)::int AS "inputTokens",
        COALESCE(SUM(u.output_tokens), 0)::int AS "outputTokens",
        COALESCE(SUM(u.total_tokens), 0)::int AS "totalTokens"
      FROM usage u
      INNER JOIN agents a
        ON a.id = u.agent_id
      INNER JOIN projects p
        ON p.id = a.project_id
      WHERE p.organization_id = $1
        AND p.deleted_at IS NULL
        AND u.status = 'SUCCESS'
        AND u.created_at >= $2
        AND u.created_at < $3
      GROUP BY 1
      ORDER BY 1
    `,
      [organizationId, from, to],
    );

    const conversations = await manager.query(
      `
      SELECT
        date_trunc('${dateTrunc}', c.created_at) AS date,
        COUNT(*)::int AS count
      FROM conversations c
      INNER JOIN projects p
        ON p.id = c.project_id
      WHERE p.organization_id = $1
        AND p.deleted_at IS NULL
        AND c.created_at >= $2
        AND c.created_at < $3
      GROUP BY 1
      ORDER BY 1
    `,
      [organizationId, from, to],
    );

    const activeUsers = await manager.query(
      `
      SELECT
        date_trunc('${dateTrunc}', c.created_at) AS date,
        COUNT(DISTINCT c.user_id)::int AS count
      FROM conversations c
      INNER JOIN projects p
        ON p.id = c.project_id
      WHERE p.organization_id = $1
        AND p.deleted_at IS NULL
        AND c.created_at >= $2
        AND c.created_at < $3
        AND c.user_id IS NOT NULL
      GROUP BY 1
      ORDER BY 1
    `,
      [organizationId, from, to],
    );

    return {
      usage: usage || [],
      conversations: conversations || [],
      activeUsers: activeUsers || [],
    };
  }

  async getAgentUsage(scope, { from, to, limit = 10 }) {
    const manager = this.dataSource.manager;

    if (scope.type === "PLATFORM") {
      return manager.query(
        `
      SELECT
        a.id,
        a.name,
        COALESCE(c.conversations, 0)::int AS conversations,
        COALESCE(u.requests, 0)::int AS requests,
        COALESCE(u.input_tokens, 0)::int AS "inputTokens",
        COALESCE(u.output_tokens, 0)::int AS "outputTokens",
        COALESCE(u.total_tokens, 0)::int AS "totalTokens",
        COALESCE(u.average_response_time_ms, 0)::int AS "averageResponseTimeMs"
      FROM agents a

      LEFT JOIN (
        SELECT
          agent_id,
          COUNT(*)::int AS conversations
        FROM conversations
        WHERE created_at >= $1
          AND created_at < $2
        GROUP BY agent_id
      ) c
        ON c.agent_id = a.id

      LEFT JOIN (
        SELECT
          agent_id,
          COUNT(*)::int AS requests,
          COALESCE(SUM(input_tokens), 0)::int AS input_tokens,
          COALESCE(SUM(output_tokens), 0)::int AS output_tokens,
          COALESCE(SUM(total_tokens), 0)::int AS total_tokens,
          COALESCE(AVG(response_time_ms), 0)::int AS average_response_time_ms
        FROM usage
        WHERE status = 'SUCCESS'
          AND created_at >= $1
          AND created_at < $2
        GROUP BY agent_id
      ) u
        ON u.agent_id = a.id

      ORDER BY requests DESC
      LIMIT $3
      `,
        [from, to, limit],
      );
    }

    return manager.query(
      `
    SELECT
      a.id,
      a.name,
      COALESCE(c.conversations, 0)::int AS conversations,
      COALESCE(u.requests, 0)::int AS requests,
      COALESCE(u.input_tokens, 0)::int AS "inputTokens",
      COALESCE(u.output_tokens, 0)::int AS "outputTokens",
      COALESCE(u.total_tokens, 0)::int AS "totalTokens",
      COALESCE(u.average_response_time_ms, 0)::int AS "averageResponseTimeMs"
    FROM agents a

    INNER JOIN projects p
      ON p.id = a.project_id

    LEFT JOIN (
      SELECT
        agent_id,
        COUNT(*)::int AS conversations
      FROM conversations
      WHERE created_at >= $2
        AND created_at < $3
      GROUP BY agent_id
    ) c
      ON c.agent_id = a.id

    LEFT JOIN (
      SELECT
        agent_id,
        COUNT(*)::int AS requests,
        COALESCE(SUM(input_tokens), 0)::int AS input_tokens,
        COALESCE(SUM(output_tokens), 0)::int AS output_tokens,
        COALESCE(SUM(total_tokens), 0)::int AS total_tokens,
        COALESCE(AVG(response_time_ms), 0)::int AS average_response_time_ms
      FROM usage
      WHERE status = 'SUCCESS'
        AND created_at >= $2
        AND created_at < $3
      GROUP BY agent_id
    ) u
      ON u.agent_id = a.id

    WHERE p.organization_id = $1
      AND p.deleted_at IS NULL

    ORDER BY requests DESC
    LIMIT $4
    `,
      [scope.organizationId, from, to, limit],
    );
  }

  async getProjectActivity(scope, { from, to, limit = 10 }) {
    const manager = this.dataSource.manager;

    if (scope.type === "PLATFORM") {
      return manager.query(
        `
        SELECT
          p.id,
          p.name,
          COUNT(u.id)::int AS requests,
          COALESCE(SUM(u.input_tokens), 0)::int AS "inputTokens",
          COALESCE(SUM(u.output_tokens), 0)::int AS "outputTokens",
          COALESCE(SUM(u.total_tokens), 0)::int AS "totalTokens",
          COALESCE(AVG(u.response_time_ms), 0)::int AS "averageResponseTimeMs"
        FROM projects p
        LEFT JOIN usage u
          ON u.agent_id IN (
            SELECT a.id
            FROM agents a
            WHERE a.project_id = p.id
          )
         AND u.status = 'SUCCESS'
         AND u.created_at >= $1
         AND u.created_at < $2
        WHERE p.deleted_at IS NULL
        GROUP BY p.id, p.name
        ORDER BY "totalTokens" DESC
        LIMIT $3
      `,
        [from, to, limit],
      );
    }

    return manager.query(
      `
      SELECT
        p.id,
        p.name,
        COUNT(u.id)::int AS requests,
        COALESCE(SUM(u.input_tokens), 0)::int AS "inputTokens",
        COALESCE(SUM(u.output_tokens), 0)::int AS "outputTokens",
        COALESCE(SUM(u.total_tokens), 0)::int AS "totalTokens",
        COALESCE(AVG(u.response_time_ms), 0)::int AS "averageResponseTimeMs"
      FROM projects p
      LEFT JOIN usage u
        ON u.agent_id IN (
          SELECT a.id
          FROM agents a
          WHERE a.project_id = p.id
        )
       AND u.status = 'SUCCESS'
       AND u.created_at >= $2
       AND u.created_at < $3
      WHERE p.organization_id = $1
        AND p.deleted_at IS NULL
      GROUP BY p.id, p.name
      ORDER BY "totalTokens" DESC
      LIMIT $4
    `,
      [scope.organizationId, from, to, limit],
    );
  }
}
