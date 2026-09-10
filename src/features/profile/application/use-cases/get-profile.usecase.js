import { OrganizationRole } from "../../../organization/domain/constants/organization-role.js";

export class GetProfileUseCase {
  constructor({
    userRepository,
    organizationRepository,
    organizationMemberRepository,
    projectRepository,
    projectMemberRepository,
    workspaceMemberPermissionRepository,
    rbacRepository,
    uploadRepository,
  }) {
    this.userRepository = userRepository;
    this.organizationRepository = organizationRepository;
    this.organizationMemberRepository = organizationMemberRepository;
    this.projectRepository = projectRepository;
    this.projectMemberRepository = projectMemberRepository;
    this.workspaceMemberPermissionRepository =
      workspaceMemberPermissionRepository;
    this.rbacRepository = rbacRepository;
    this.uploadRepository = uploadRepository;
  }

  async execute({ userId }) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      const error = new Error("User not found.");
      error.statusCode = 404;
      throw error;
    }

    const isPlatformUser =
      user.platformRole === "PLATFORM_ADMIN" ||
      user.platformRole === "PLATFORM_MANAGER";

    const portal = isPlatformUser ? "PLATFORM" : "WORKSPACE";

    const organizationMemberships =
      await this.organizationMemberRepository.findAllByUser(userId);

    const projectMemberships =
      await this.projectMemberRepository.findAllByUser(userId);

    let permissions = [];

    if (isPlatformUser) {
      permissions = await this.rbacRepository.getUserPermissions(userId);
    } else {
      const rolePermissions = [];
      const memberPermissions = [];

      for (const membership of organizationMemberships) {
        if (membership.role === OrganizationRole.OWNER) {
          const role =
            await this.rbacRepository.getRoleByName("WORKSPACE_OWNER");

          if (role) {
            rolePermissions.push(
              ...(await this.rbacRepository.getPermissionsByRoleId(role.id)),
            );
          }
        }

        memberPermissions.push(
          ...(await this.workspaceMemberPermissionRepository.getPermissions(
            membership.id,
          )),
        );
      }

      permissions = [
        ...new Map(
          [...rolePermissions, ...memberPermissions].map((permission) => [
            permission.permissionKey,
            permission,
          ]),
        ).values(),
      ];
    }

    let organizations = [];
    let projects = [];

    if (isPlatformUser) {
      organizations = await this.organizationRepository.findAll();
      projects = await this.projectRepository.findAll();
    } else {
      const organizationIds = [
        ...new Set(
          organizationMemberships.map(
            (membership) => membership.organizationId,
          ),
        ),
      ];

      const projectIds = [
        ...new Set(
          projectMemberships.map((membership) => membership.projectId),
        ),
      ];

      organizations =
        await this.organizationRepository.findByIds(organizationIds);

      projects = await this.projectRepository.findByIds(projectIds);
    }

    const profilePhoto = user.profilePhotoUploadId
      ? await this.uploadRepository.findById(user.profilePhotoUploadId)
      : null;

    const organizationMap = new Map(
      organizations.map((organization) => [organization.id, organization]),
    );

    const projectMap = new Map(
      projects.map((project) => [project.id, project]),
    );

    return {
      portal,

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        platformRole: user.platformRole,
        role: user.role,
        profilePhotoUploadId: user.profilePhotoUploadId,
        profilePhotoUrl: profilePhoto?.storageUrl ?? null,
        createdAt: user.createdAt,
      },

      permissions,

      summary: {
        organizationCount: organizations.length,
        projectCount: projects.length,
      },

      organizations: organizationMemberships.map((membership) => {
        const organization = organizationMap.get(membership.organizationId);

        return {
          ...membership,
          role: membership.role ?? OrganizationRole.MEMBER,

          organization: organization
            ? {
                id: organization.id,
                name: organization.name,
                slug: organization.slug,
                ownerId: organization.ownerId,
                logo: organization.logo,
                website: organization.website,
                description: organization.description,
                status: organization.status,
                createdAt: organization.createdAt,
                updatedAt: organization.updatedAt,
              }
            : null,
        };
      }),

      projects: projectMemberships.map((membership) => ({
        ...membership,
        project: projectMap.get(membership.projectId),
      })),
    };
  }
}
