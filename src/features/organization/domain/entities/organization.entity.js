export class OrganizationEntity {
  constructor({
    id,
    name,
    slug,
    ownerId,
    planId = null,
    logo = null,
    website = null,
    description = null,
    status = "ACTIVE",
    createdAt,
    updatedAt,
    deletedAt,
    memberCount = 0,
    projectCount = 0,
  }) {
    this.id = id;
    this.name = name;
    this.slug = slug;
    this.ownerId = ownerId;
    this.planId = planId;
    this.logo = logo;
    this.website = website;
    this.description = description;
    this.status = status;

    this.memberCount = Number(memberCount);
    this.projectCount = Number(projectCount);

    if (createdAt) this.createdAt = createdAt;
    if (updatedAt) this.updatedAt = updatedAt;
    if (deletedAt) this.deletedAt = deletedAt;
  }
}
