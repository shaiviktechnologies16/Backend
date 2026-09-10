import { AppDataSource } from "../../../../database/datasource.js";
import { AdminRepository } from "../../domain/repositories/admin.repository.js";
import { UserOrm } from "../../../../database/entities/user.orm.js";
import { AdminDashboardEntity } from "../../domain/entities/admin-dashboard.entity.js";
import { AdminUserEntity } from "../../domain/entities/admin-user.entity.js";
import { PlatformRole } from "../../domain/constants/platform-role.js";

export class AdminRepositoryImpl extends AdminRepository {
  constructor(dataSource = AppDataSource, aiProviderFactory = null) {
    super();
    this.dataSource = dataSource;
    this.aiProviderFactory = aiProviderFactory;
  }

  async getDashboardStats() {
    const manager = this.dataSource.manager;

    const [
      users,
      organizations,
      projects,
      agents,
      conversations,
      messages,
      activeOrganizations,
      activeUsers,
      organizationsToday,
      usersToday,
      recentOrganizations,
      activities,
    ] = await Promise.all([
      manager.query(`
      SELECT COUNT(*)::int AS count
      FROM users
    `),

      manager.query(`
      SELECT COUNT(*)::int AS count
      FROM organizations
    `),

      manager.query(`
      SELECT COUNT(*)::int AS count
      FROM projects
    `),

      manager.query(`
      SELECT COUNT(*)::int AS count
      FROM agents
    `),

      manager.query(`
      SELECT COUNT(*)::int AS count
      FROM conversations
    `),

      manager.query(`
      SELECT COUNT(*)::int AS count
      FROM messages
    `),

      manager.query(`
      SELECT COUNT(*)::int AS count
      FROM organizations
      WHERE status = 'ACTIVE'
        AND deleted_at IS NULL
    `),

      manager.query(`
      SELECT COUNT(*)::int AS count
      FROM users
      WHERE is_active = true
    `),

      manager.query(`
      SELECT COUNT(*)::int AS count
      FROM organizations
      WHERE created_at >= CURRENT_DATE
        AND deleted_at IS NULL
    `),

      manager.query(`
      SELECT COUNT(*)::int AS count
      FROM users
      WHERE created_at >= CURRENT_DATE
    `),

      manager.query(`
      SELECT
        id,
        name,
        slug,
        status,
        created_at AS "createdAt"
      FROM organizations
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 5
    `),

      manager.query(`
      SELECT
        type,
        title,
        description,
        created_at AS "createdAt"
      FROM (
        SELECT
          'organization_created' AS type,
          'New organization created' AS title,
          name || ' joined the platform' AS description,
          created_at
        FROM organizations
        WHERE deleted_at IS NULL

        UNION ALL

        SELECT
          'agent_created' AS type,
          'AI agent created' AS title,
          name || ' was created' AS description,
          created_at
        FROM agents

        UNION ALL

        SELECT
          'user_registered' AS type,
          'New user registered' AS title,
          'User account created successfully' AS description,
          created_at
        FROM users
      ) activity
      ORDER BY created_at DESC
      LIMIT 5
    `),
    ]);

    const systemStatus = await this.getSystemStatus();

    return new AdminDashboardEntity({
      users: users[0].count,
      organizations: organizations[0].count,
      projects: projects[0].count,
      agents: agents[0].count,
      conversations: conversations[0].count,
      messages: messages[0].count,

      activeOrganizations: activeOrganizations[0].count,
      activeUsers: activeUsers[0].count,
      organizationsToday: organizationsToday[0].count,
      usersToday: usersToday[0].count,

      recentOrganizations,
      activities,
      systemStatus,
    });
  }

  async getSystemStatus() {
    const systemStatus = [
      {
        name: "API Server",
        status: "Healthy",
      },
    ];

    try {
      await this.dataSource.query("SELECT 1");

      systemStatus.push({
        name: "Database",
        status: "Healthy",
      });
    } catch {
      systemStatus.push({
        name: "Database",
        status: "Unhealthy",
      });
    }

    try {
      const ollamaBaseUrl =
        process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";

      const response = await fetch(ollamaBaseUrl, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });

      systemStatus.push({
        name: "AI Service",
        status: response.ok ? "Healthy" : "Unhealthy",
      });
    } catch {
      systemStatus.push({
        name: "AI Service",
        status: "Unhealthy",
      });
    }

    return systemStatus;
  }

  async checkDatabaseHealth() {
    try {
      await this.dataSource.query("SELECT 1");

      return "Healthy";
    } catch {
      return "Unhealthy";
    }
  }

  async checkAIHealth() {
    if (!this.ollamaProvider) {
      return "Unknown";
    }

    try {
      return await this.ollamaProvider.healthCheck();
    } catch {
      return "Unhealthy";
    }
  }

  async getUsers({
    page = 1,
    limit = 10,
    search = "",
    sortBy = "createdAt",
    sortOrder = "DESC",
    role = null,
    roles = [],
  }) {
    const repository = this.dataSource.getRepository(UserOrm);

    const queryBuilder = repository.createQueryBuilder("user");

    if (roles?.length) {
      queryBuilder.andWhere("user.platformRole IN (:...roles)", { roles });
    } else if (role) {
      queryBuilder.andWhere("user.platformRole = :role", { role });
    }

    if (search?.trim()) {
      queryBuilder.andWhere(
        `(LOWER(user.name) LIKE LOWER(:search)
      OR LOWER(user.email) LIKE LOWER(:search))`,
        {
          search: `%${search.trim()}%`,
        },
      );
    }

    const sortableFields = {
      fullName: "user.name",
      email: "user.email",
      platformRole: "user.platformRole",
      createdAt: "user.createdAt",
      updatedAt: "user.updatedAt",
    };

    queryBuilder.orderBy(
      sortableFields[sortBy] ?? sortableFields.createdAt,
      sortOrder?.toUpperCase() === "ASC" ? "ASC" : "DESC",
    );

    queryBuilder.skip((page - 1) * limit);
    queryBuilder.take(limit);

    const [users, total] = await queryBuilder.getManyAndCount();

    return {
      users: await Promise.all(
        users.map(async (user) => {
          let permissions;

          if (user.platformRole === PlatformRole.PLATFORM_ADMIN) {
            permissions = await this.dataSource.query(`
            SELECT permission_key
            FROM permissions
            ORDER BY permission_key
          `);
          } else {
            permissions = await this.dataSource.query(
              `
            SELECT p.permission_key
            FROM user_permissions up
            JOIN permissions p
              ON p.id = up.permission_id
            WHERE up.user_id = $1
            `,
              [user.id],
            );
          }

          const organizations = await this.dataSource.query(
            `
          SELECT
            o.id,
            o.name,
            o.slug,
            o.status,
            om.role
          FROM organization_members om
          JOIN organizations o
            ON o.id = om.organization_id
          WHERE om.user_id = $1
          ORDER BY o.name ASC
          `,
            [user.id],
          );

          return new AdminUserEntity({
            id: user.id,
            fullName: user.name,
            email: user.email,
            platformRole: user.platformRole,
            isActive: user.isActive,
            permissions: permissions.map((item) => item.permission_key),
            organizations: organizations.map((organization) => ({
              id: organization.id,
              name: organization.name,
              slug: organization.slug,
              status: organization.status,
              role: organization.role,
            })),
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          });
        }),
      ),

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserById(id) {
    const repository = this.dataSource.getRepository(UserOrm);
    const user = await repository.findOne({
      where: { id },
    });

    if (!user) {
      return null;
    }

    let permissions;

    if (user.platformRole === PlatformRole.PLATFORM_ADMIN) {
      permissions = await this.dataSource.query(`
    SELECT permission_key
    FROM permissions
    ORDER BY permission_key
  `);
    } else if (user.platformRole === PlatformRole.WORKSPACE) {
      permissions = await this.dataSource.query(`
    SELECT permission_key
    FROM permissions
    WHERE permission_key LIKE 'projects.%'
       OR permission_key LIKE 'agents.%'
       OR permission_key LIKE 'knowledge.%'
       OR permission_key LIKE 'members.%'
    ORDER BY permission_key
  `);
    } else {
      permissions = await this.dataSource.query(
        `
    SELECT p.permission_key
    FROM user_permissions up
    JOIN permissions p
      ON p.id = up.permission_id
    WHERE up.user_id = $1
    ORDER BY p.permission_key
    `,
        [user.id],
      );
    }

    return new AdminUserEntity({
      id: user.id,
      fullName: user.name,
      email: user.email,
      platformRole: user.platformRole,
      permissions: permissions.map((item) => item.permission_key),
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }

  async updatePlatformRole(id, platformRole) {
    const repository = this.dataSource.getRepository(UserOrm);
    await repository.update(id, {
      platformRole,
    });

    return this.getUserById(id);
  }

  async deleteUser(id) {
    const repository = this.dataSource.getRepository(UserOrm);

    await repository.delete(id);
  }

  async countPlatformAdmins() {
    const repository = this.dataSource.getRepository(UserOrm);

    return repository.count({
      where: {
        platformRole: PlatformRole.PLATFORM_ADMIN,
      },
    });
  }

  async updateAdminStatus({ userId, isActive }) {
    const repository = this.dataSource.getRepository(UserOrm);

    const user = await repository.findOne({
      where: { id: userId },
    });

    if (!user) {
      return null;
    }

    user.isActive = isActive;

    await repository.save(user);

    return {
      id: user.id,
      fullName: user.name,
      email: user.email,
      platformRole: user.platformRole,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
  async deleteAdmin(userId) {
    const repository = this.dataSource.getRepository(UserOrm);

    await repository.delete(userId);
  }

  async getUserByEmail(email) {
    const repository = this.dataSource.getRepository(UserOrm);
    const user = await repository.findOne({
      where: {
        email,
      },
    });

    return user;
  }

  async createAdmin({
    name,
    email,
    passwordHash,
    platformRole,
    isActive,
    roleId,
  }) {
    const repository = this.dataSource.getRepository(UserOrm);

    const user = repository.create({
      name,
      email,
      passwordHash,
      platformRole,
      isActive,
      role: {
        id: roleId,
      },
    });

    return repository.save(user);
  }
}
