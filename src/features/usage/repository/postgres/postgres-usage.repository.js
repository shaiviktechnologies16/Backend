import { UsageRepository } from "../interfaces/usage.repository.js";
import { Usage } from "../../entity/usage.entity.js";
import { AppDataSource } from "../../../../database/datasource.js";

export class PostgresUsageRepository extends UsageRepository {
  constructor(dataSource = AppDataSource) {
    super();
    this.dataSource = dataSource;
  }

  async create(usage, manager = null) {
    const repository = (manager ?? this.dataSource.manager).getRepository(
      "Usage",
    );

    const entity = repository.create({
      id: usage.id,
      agentId: usage.agentId,
      conversationId: usage.conversationId,
      visitorId: usage.visitorId,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
      responseTimeMs: usage.responseTimeMs,
      status: usage.status,
      errorCode: usage.errorCode,
      createdAt: usage.createdAt,
    });

    const saved = await repository.save(entity);

    return new Usage({
      id: saved.id,
      agentId: saved.agentId,
      conversationId: saved.conversationId,
      visitorId: saved.visitorId,
      inputTokens: saved.inputTokens,
      outputTokens: saved.outputTokens,
      totalTokens: saved.totalTokens,
      responseTimeMs: saved.responseTimeMs,
      status: saved.status,
      errorCode: saved.errorCode,
      createdAt: saved.createdAt,
    });
  }

  async countByConversationId(conversationId, manager = null) {
    const repository = (manager ?? this.dataSource.manager).getRepository(
      "Usage",
    );

    return repository.count({
      where: {
        conversationId,
        status: "SUCCESS",
      },
    });
  }

  async countByVisitorIdAndDateRange(
    visitorId,
    startDate,
    endDate,
    manager = null,
  ) {
    const repository = (manager ?? this.dataSource.manager).getRepository(
      "Usage",
    );

    return repository
      .createQueryBuilder("usage")
      .where("usage.visitorId = :visitorId", { visitorId })
      .andWhere("usage.status = :status", { status: "SUCCESS" })
      .andWhere("usage.createdAt >= :startDate", { startDate })
      .andWhere("usage.createdAt < :endDate", { endDate })
      .getCount();
  }

  async findByAgentId(agentId, options = {}, manager = null) {
    const repository = (manager ?? this.dataSource.manager).getRepository(
      "Usage",
    );

    const query = {
      where: {
        agentId,
      },
      order: {
        createdAt: "DESC",
      },
    };

    if (options.limit !== undefined) {
      query.take = options.limit;
    }

    if (options.offset !== undefined) {
      query.skip = options.offset;
    }

    return repository.find(query);
  }

  async getAgentSummary(agentId, startDate = null, endDate = null) {
    const repository = this.dataSource.manager.getRepository("Usage");

    const query = repository
      .createQueryBuilder("usage")
      .select("COUNT(*)", "requests")
      .addSelect("COALESCE(SUM(usage.inputTokens), 0)", "inputTokens")
      .addSelect("COALESCE(SUM(usage.outputTokens), 0)", "outputTokens")
      .addSelect("COALESCE(SUM(usage.totalTokens), 0)", "totalTokens")
      .addSelect(
        "COALESCE(AVG(usage.responseTimeMs), 0)",
        "averageResponseTimeMs",
      )
      .where("usage.agentId = :agentId", { agentId })
      .andWhere("usage.status = :status", { status: "SUCCESS" });

    if (startDate) {
      query.andWhere("usage.createdAt >= :startDate", { startDate });
    }

    if (endDate) {
      query.andWhere("usage.createdAt < :endDate", { endDate });
    }

    const result = await query.getRawOne();

    return {
      requests: Number(result.requests ?? 0),
      inputTokens: Number(result.inputTokens ?? 0),
      outputTokens: Number(result.outputTokens ?? 0),
      totalTokens: Number(result.totalTokens ?? 0),
      averageResponseTimeMs: Math.round(
        Number(result.averageResponseTimeMs ?? 0),
      ),
    };
  }

  async getAgentTimeSeries(agentId, startDate = null, endDate = null) {
    const repository = this.dataSource.manager.getRepository("Usage");

    const query = repository
      .createQueryBuilder("usage")
      .select("DATE_TRUNC('day', usage.createdAt)", "date")
      .addSelect("COUNT(*)", "requests")
      .addSelect("COALESCE(SUM(usage.inputTokens), 0)", "inputTokens")
      .addSelect("COALESCE(SUM(usage.outputTokens), 0)", "outputTokens")
      .addSelect("COALESCE(SUM(usage.totalTokens), 0)", "totalTokens")
      .where("usage.agentId = :agentId", { agentId })
      .andWhere("usage.status = :status", { status: "SUCCESS" })
      .groupBy("DATE_TRUNC('day', usage.createdAt)")
      .orderBy("DATE_TRUNC('day', usage.createdAt)", "ASC");

    if (startDate) {
      query.andWhere("usage.createdAt >= :startDate", { startDate });
    }

    if (endDate) {
      query.andWhere("usage.createdAt < :endDate", { endDate });
    }

    const rows = await query.getRawMany();

    return rows.map((row) => ({
      date: row.date,
      requests: Number(row.requests ?? 0),
      inputTokens: Number(row.inputTokens ?? 0),
      outputTokens: Number(row.outputTokens ?? 0),
      totalTokens: Number(row.totalTokens ?? 0),
    }));
  }
}
