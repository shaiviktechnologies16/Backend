export class OrganizationMemberRepository {
  async create(member, manager = null) {
    throw new Error("Not implemented");
  }

  async findById(id, manager = null) {
    throw new Error("Not implemented");
  }

  async findByUserId(userId, manager = null) {
    throw new Error("Not implemented");
  }

  async findAllByUser(userId, manager = null) {
    throw new Error("Not implemented");
  }

  async findByOrganizationAndUser(organizationId, userId, manager = null) {
    throw new Error("Not implemented");
  }

  async findByOrganizationAndUserIncludingRemoved(
    organizationId,
    userId,
    manager = null,
  ) {
    throw new Error(
      "findByOrganizationAndUserIncludingRemoved() not implemented.",
    );
  }

  async findAllByOrganization(organizationId, manager = null) {
    throw new Error("Not implemented");
  }

  async findOwnerByOrganizationId(organizationId, manager = null) {
    throw new Error("Not implemented");
  }

  async countByOrganization(organizationId, manager = null) {
    throw new Error("Method not implemented.");
  }

  async updateRole(id, role, manager = null) {
    throw new Error("Not implemented");
  }

  async remove(id, manager = null) {
    throw new Error("Not implemented");
  }

  async restore(id, role, invitedBy, manager = null) {
    throw new Error("restore() not implemented.");
  }
}
