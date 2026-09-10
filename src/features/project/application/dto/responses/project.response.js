export class ProjectResponse {
  static fromEntity(project) {
    return {
      id: project.id,
      organizationId: project.organizationId,
      name: project.name,
      description: project.description,
      status: project.status,
      createdBy: project.createdBy,

      organization: project.organization
        ? {
            id: project.organization.id,
            name: project.organization.name,
          }
        : null,

      owner: project.owner
        ? {
            id: project.owner.id,
            name: project.owner.name,
            email: project.owner.email ?? null,
          }
        : null,

      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  static fromEntities(projects) {
    return projects.map((project) => this.fromEntity(project));
  }
}
