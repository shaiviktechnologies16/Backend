import { PlanRepository } from "../../domain/repositories/plan.repository.js";
import { Plan } from "../../domain/entities/plan.entity.js";
import { PlanUsageLimit } from "../../domain/entities/plan-usage-limit.entity.js";

export class PlanRepositoryImpl extends PlanRepository {
  constructor(dataSource) {
    super();
    this.dataSource = dataSource;
  }

  async findById(id) {
    return this.dataSource.manager.findOne("Plan", {
      where: { id },
      relations: ["usageLimit", "features"],
    });
  }

  async findByCode(code, manager = this.dataSource.manager) {
    return manager.findOne("Plan", {
      where: { code },
    });
  }

  async findAll() {
    return this.dataSource.manager.find("Plan", {
      relations: ["usageLimit", "features"],
      order: {
        displayOrder: "ASC",
        createdAt: "ASC",
      },
    });
  }

  async create(plan) {
    return this.dataSource.manager.save("Plan", plan);
  }

  async update(id, data) {
    await this.dataSource.manager.update("Plan", id, data);

    return this.findById(id);
  }

  async delete(id) {
    await this.dataSource.manager.delete("Plan", id);
  }

  async findUsageLimit(planId) {
    return this.dataSource.manager.findOne("PlanUsageLimit", {
      where: { planId },
    });
  }

  async updateUsageLimit(planId, data) {
    const existing = await this.findUsageLimit(planId);

    if (existing) {
      await this.dataSource.manager.update("PlanUsageLimit", { planId }, data);
    } else {
      await this.dataSource.manager.save("PlanUsageLimit", {
        planId,
        ...data,
      });
    }

    return this.findUsageLimit(planId);
  }

  async countOrganizations(planId) {
    return this.dataSource.manager.count("Organization", {
      where: { planId },
    });
  }

  async assignToOrganization(organizationId, planId) {
    const plan = await this.findById(planId);

    if (!plan) {
      throw new Error("Plan not found");
    }

    const organization = await this.dataSource.manager.findOne("Organization", {
      where: { id: organizationId },
    });

    if (!organization) {
      throw new Error("Organization not found");
    }

    await this.dataSource.manager.update(
      "Organization",
      { id: organizationId },
      { planId },
    );

    return this.findOrganizationPlan(organizationId);
  }

  async getUsageStats({ organizationId, startDate }) {
    const result = await this.dataSource.query(
      `
        SELECT
          COUNT(u.id)::int AS requests,
          COALESCE(
            SUM(u.total_tokens),
            0
          )::int AS tokens
        FROM usage u
        INNER JOIN agents a
          ON a.id = u.agent_id
        INNER JOIN projects p
          ON p.id = a.project_id
        WHERE p.organization_id = $1
          AND u.created_at >= $2
          AND u.status = 'SUCCESS'
        `,
      [organizationId, startDate],
    );

    return {
      requests: Number(result[0]?.requests ?? 0),
      tokens: Number(result[0]?.tokens ?? 0),
    };
  }

  async getConversationCount({ organizationId, startDate }) {
    const result = await this.dataSource.query(
      `
        SELECT
          COUNT(c.id)::int AS conversations
        FROM conversations c
        INNER JOIN projects p
          ON p.id = c.project_id
        WHERE p.organization_id = $1
          AND c.created_at >= $2
        `,
      [organizationId, startDate],
    );

    return Number(result[0]?.conversations ?? 0);
  }

  async findOrganizationPlan(organizationId) {
    return this.dataSource.manager
      .createQueryBuilder("Organization", "organization")
      .leftJoinAndSelect("organization.plan", "plan")
      .where("organization.id = :organizationId", { organizationId })
      .getOne()
      .then((organization) => organization?.plan ?? null);
  }

  async getUsageOverview({
    organizationId,
    visitorId = null,
    dayStart,
    monthStart,
  }) {
    const result = await this.dataSource.query(
      `
        SELECT
          COUNT(
            u.id
          ) FILTER (
            WHERE u.created_at >= $2
          )::int AS daily_requests,

          COUNT(
            u.id
          ) FILTER (
            WHERE u.created_at >= $3
          )::int AS monthly_requests,

          COALESCE(
            SUM(
              u.total_tokens
            ) FILTER (
              WHERE u.created_at >= $2
            ),
            0
          )::int AS daily_tokens,

          COALESCE(
            SUM(
              u.total_tokens
            ) FILTER (
              WHERE u.created_at >= $3
            ),
            0
          )::int AS monthly_tokens,

          COUNT(
            DISTINCT c.id
          ) FILTER (
            WHERE c.created_at >= $2
          )::int AS daily_conversations,

          COUNT(
            DISTINCT c.id
          ) FILTER (
            WHERE c.created_at >= $3
          )::int AS monthly_conversations,

          COUNT(
            DISTINCT u.visitor_id
          ) FILTER (
            WHERE u.created_at >= $2
              AND u.visitor_id IS NOT NULL
          )::int AS daily_unique_visitors,

          COUNT(
            DISTINCT u.visitor_id
          ) FILTER (
            WHERE u.created_at >= $3
              AND u.visitor_id IS NOT NULL
          )::int AS monthly_unique_visitors,

          COUNT(
            u.id
          ) FILTER (
            WHERE u.created_at >= $2
              AND u.visitor_id = $4
          )::int AS daily_visitor_messages,

          COUNT(
            u.id
          ) FILTER (
            WHERE u.created_at >= $3
              AND u.visitor_id = $4
          )::int AS monthly_visitor_messages

        FROM usage u

        INNER JOIN agents a
          ON a.id = u.agent_id

        INNER JOIN projects p
          ON p.id = a.project_id

        LEFT JOIN conversations c
          ON c.id = u.conversation_id

        WHERE p.organization_id = $1
          AND u.status = 'SUCCESS'
          AND (
            u.created_at >= $3
            OR c.created_at >= $3
          )
        `,
      [organizationId, dayStart, monthStart, visitorId],
    );

    const row = result[0] ?? {};

    return {
      dailyUsage: {
        requests: Number(row.daily_requests ?? 0),
        tokens: Number(row.daily_tokens ?? 0),
      },

      monthlyUsage: {
        requests: Number(row.monthly_requests ?? 0),
        tokens: Number(row.monthly_tokens ?? 0),
      },

      dailyConversations: Number(row.daily_conversations ?? 0),

      monthlyConversations: Number(row.monthly_conversations ?? 0),

      dailyUniqueVisitors: Number(row.daily_unique_visitors ?? 0),

      monthlyUniqueVisitors: Number(row.monthly_unique_visitors ?? 0),

      dailyVisitorMessages: Number(row.daily_visitor_messages ?? 0),

      monthlyVisitorMessages: Number(row.monthly_visitor_messages ?? 0),
    };
  }

  async getUniqueVisitorCount({ organizationId, startDate, endDate = null }) {
    const params = [organizationId, startDate];

    let endCondition = "";

    if (endDate) {
      params.push(endDate);
      endCondition = "AND u.created_at < $3";
    }

    const result = await this.dataSource.query(
      `
        SELECT
          COUNT(
            DISTINCT u.visitor_id
          )::int AS visitors
        FROM usage u
        INNER JOIN agents a
          ON a.id = u.agent_id
        INNER JOIN projects p
          ON p.id = a.project_id
        WHERE p.organization_id = $1
          AND u.created_at >= $2
          ${endCondition}
          AND u.status = 'SUCCESS'
          AND u.visitor_id IS NOT NULL
        `,
      params,
    );

    return Number(result[0]?.visitors ?? 0);
  }

  async getVisitorMessageCount({
    organizationId,
    visitorId,
    startDate,
    endDate = null,
  }) {
    const params = [organizationId, visitorId, startDate];

    let endCondition = "";

    if (endDate) {
      params.push(endDate);
      endCondition = "AND u.created_at < $4";
    }

    const result = await this.dataSource.query(
      `
        SELECT
          COUNT(u.id)::int AS messages
        FROM usage u
        INNER JOIN agents a
          ON a.id = u.agent_id
        INNER JOIN projects p
          ON p.id = a.project_id
        WHERE p.organization_id = $1
          AND u.visitor_id = $2
          AND u.created_at >= $3
          ${endCondition}
          AND u.status = 'SUCCESS'
        `,
      params,
    );

    return Number(result[0]?.messages ?? 0);
  }

  async getVisitorUsage({
    organizationId,
    visitorId,
    startDate,
    endDate = null,
  }) {
    const params = [organizationId, visitorId, startDate];

    let endCondition = "";

    if (endDate) {
      params.push(endDate);
      endCondition = "AND u.created_at < $4";
    }

    const result = await this.dataSource.query(
      `
        SELECT
          COUNT(u.id)::int AS requests,
          COALESCE(
            SUM(u.total_tokens),
            0
          )::int AS tokens
        FROM usage u
        INNER JOIN agents a
          ON a.id = u.agent_id
        INNER JOIN projects p
          ON p.id = a.project_id
        WHERE p.organization_id = $1
          AND u.visitor_id = $2
          AND u.created_at >= $3
          ${endCondition}
          AND u.status = 'SUCCESS'
        `,
      params,
    );

    return {
      requests: Number(result[0]?.requests ?? 0),
      tokens: Number(result[0]?.tokens ?? 0),
    };
  }
  async findOrganizationPlanWithLimits(organizationId) {
    const result = await this.dataSource.query(
      `
    SELECT
      p.id AS plan_id,
      p.name AS plan_name,
      p.code AS plan_code,
      p.description AS plan_description,
      p.is_active AS plan_is_active,
      p.created_at AS plan_created_at,
      p.updated_at AS plan_updated_at,

      l.id AS limit_id,
      l.plan_id AS limit_plan_id,
      l.requests_per_day,
      l.requests_per_month,
      l.tokens_per_day,
      l.tokens_per_month,
      l.conversations_per_day,
      l.conversations_per_month,
      l.unique_visitors_per_day,
      l.unique_visitors_per_month,
      l.messages_per_visitor_per_day,
      l.messages_per_visitor_per_month,
      l.created_at AS limit_created_at,
      l.updated_at AS limit_updated_at

    FROM organizations o
    INNER JOIN plans p
      ON p.id = o.plan_id
    LEFT JOIN plan_usage_limits l
      ON l.plan_id = p.id
    WHERE o.id = $1
    LIMIT 1
    `,
      [organizationId],
    );

    const row = result[0];

    if (!row) {
      return null;
    }

    return {
      plan: new Plan({
        id: row.plan_id,
        name: row.plan_name,
        code: row.plan_code,
        description: row.plan_description,
        isActive: row.plan_is_active,
        createdAt: row.plan_created_at,
        updatedAt: row.plan_updated_at,
      }),

      limits: row.limit_id
        ? new PlanUsageLimit({
            id: row.limit_id,
            planId: row.limit_plan_id,
            requestsPerDay: row.requests_per_day,
            requestsPerMonth: row.requests_per_month,
            tokensPerDay: row.tokens_per_day,
            tokensPerMonth: row.tokens_per_month,
            conversationsPerDay: row.conversations_per_day,
            conversationsPerMonth: row.conversations_per_month,
            uniqueVisitorsPerDay: row.unique_visitors_per_day,
            uniqueVisitorsPerMonth: row.unique_visitors_per_month,
            messagesPerVisitorPerDay: row.messages_per_visitor_per_day,
            messagesPerVisitorPerMonth: row.messages_per_visitor_per_month,
            createdAt: row.limit_created_at,
            updatedAt: row.limit_updated_at,
          })
        : null,
    };
  }
}
