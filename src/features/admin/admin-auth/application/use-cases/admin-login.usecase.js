import { AppError } from "../../../../../common/errors/AppError.js";
import { ADMIN_AUTH } from "../../domain/constants/admin-auth.constants.js";
import { AdminLoginResponseDto } from "../dto/admin-login-response.dto.js";
import envConfig from "../../../../../config/env.config.js";

export class AdminLoginUseCase {
  constructor({
    adminAuthRepository,
    passwordService,
    jwtService,
    tokenHashService,
    getUserPermissionsUseCase,
    organizationMemberRepository,
    organizationRepository,
    adminSessionRepository,
    workspaceMemberPermissionRepository,
    rbacRepository,
    permissionRepository,
  }) {
    this.adminAuthRepository = adminAuthRepository;
    this.passwordService = passwordService;
    this.jwtService = jwtService;
    this.tokenHashService = tokenHashService;
    this.getUserPermissionsUseCase = getUserPermissionsUseCase;
    this.organizationMemberRepository = organizationMemberRepository;
    this.organizationRepository = organizationRepository;
    this.adminSessionRepository = adminSessionRepository;
    this.workspaceMemberPermissionRepository =
      workspaceMemberPermissionRepository;
    this.rbacRepository = rbacRepository;
    this.permissionRepository = permissionRepository;
  }

  async execute(loginDto, sessionContext = {}) {
    loginDto.validate();

    const admin = await this.adminAuthRepository.findByEmail(loginDto.email);

    if (!admin) {
      throw new AppError(
        "Invalid email or password.",
        401,
        "INVALID_CREDENTIALS",
      );
    }

    const passwordMatched = await this.passwordService.compare(
      loginDto.password,
      admin.passwordHash,
    );

    if (!passwordMatched) {
      throw new AppError(
        "Invalid email or password.",
        401,
        "INVALID_CREDENTIALS",
      );
    }

    if (!admin.isActive) {
      throw new AppError(
        "Your account has been disabled. Contact administrator.",
        403,
        "ACCOUNT_DISABLED",
      );
    }

    const memberships = await this.organizationMemberRepository.findAllByUser(
      admin.id,
    );

    const isPlatformUser =
      admin.platformRole === ADMIN_AUTH.ROLES.PLATFORM_ADMIN ||
      admin.platformRole === ADMIN_AUTH.ROLES.PLATFORM_MANAGER;

    const workspaceRoles = ["OWNER", "ADMIN", "MEMBER"];

    const isWorkspaceUser = memberships.some((member) =>
      workspaceRoles.includes(member.role),
    );

    if (!isPlatformUser && !isWorkspaceUser) {
      throw new AppError(
        "You are not authorized to access the admin portal.",
        403,
        "ADMIN_ACCESS_REQUIRED",
      );
    }

    const portal = isPlatformUser ? "PLATFORM" : "WORKSPACE";

    let organizations = [];

    if (isPlatformUser) {
      organizations = await this.organizationRepository.findAll();
    } else {
      const organizationIds = memberships.map(
        (member) => member.organizationId,
      );

      organizations =
        await this.organizationRepository.findByIds(organizationIds);

      const activeOrganizations = organizations.filter(
        (organization) => organization.status === "ACTIVE",
      );

      if (activeOrganizations.length === 0) {
        throw new AppError(
          "Your organization is currently disabled. Contact your administrator.",
          403,
          "ORGANIZATION_DISABLED",
        );
      }
    }

    let permissions = [];

    if (admin.platformRole === ADMIN_AUTH.ROLES.PLATFORM_ADMIN) {
      permissions = await this.permissionRepository.findAll();
    } else if (isPlatformUser) {
      permissions = await this.getUserPermissionsUseCase.execute(admin.id);
    } else {
      const activeOrganizationIds = organizations
        .filter((organization) => organization.status === "ACTIVE")
        .map((organization) => organization.id);

      const activeMembership = memberships.find((membership) =>
        activeOrganizationIds.includes(membership.organizationId),
      );

      if (activeMembership?.role === "OWNER") {
        const role = await this.rbacRepository.getRoleByName("WORKSPACE_OWNER");

        if (role) {
          permissions = await this.rbacRepository.getPermissionsByRoleId(
            role.id,
          );
        }
      } else if (activeMembership) {
        permissions =
          await this.workspaceMemberPermissionRepository.getPermissions(
            activeMembership.id,
          );
      }
    }

    const organizationsResponse = organizations.map((organization) => {
      const membership = memberships.find(
        (member) => member.organizationId === organization.id,
      );

      return {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        role: isPlatformUser ? "PLATFORM" : membership?.role,
        status: organization.status,
      };
    });

    const accessToken = await this.jwtService.generateAccessToken({
      userId: admin.id,
      email: admin.email,
      platformRole: isPlatformUser ? admin.platformRole : null,
    });

    const refreshToken = await this.jwtService.generateRefreshToken({
      userId: admin.id,
    });

    const refreshTokenHash = this.tokenHashService.hash(refreshToken);

    await this.adminSessionRepository.create({
      userId: admin.id,
      refreshTokenHash,
      expiresAt: new Date(
        Date.now() + envConfig.jwt.refreshExpiresDays * 24 * 60 * 60 * 1000,
      ),
      userAgent: sessionContext.userAgent,
      ipAddress: sessionContext.ipAddress,
    });

    return new AdminLoginResponseDto({
      portal,
      accessToken,
      refreshToken,
      admin,
      permissions: permissions.map((permission) => permission.permissionKey),
      organizations: organizationsResponse,
    });
  }
}
