export class OrganizationInvitationRepository {
  async create(invitation, manager = null) {
    throw new Error("create() not implemented.");
  }

  async update(invitation, manager = null) {
    throw new Error("update() not implemented.");
  }

  async findById(id, manager = null) {
    throw new Error("findById() not implemented.");
  }

  async findByToken(token, manager = null) {
    throw new Error("findByToken() not implemented.");
  }

  async findPendingByOrganizationAndEmail(
    organizationId,
    email,
    manager = null,
  ) {
    throw new Error("findPendingByOrganizationAndEmail() not implemented.");
  }

  async findPendingByEmail(email, manager = null) {
    throw new Error("findPendingByEmail() not implemented.");
  }

  async findByEmail(email, manager = null) {
    throw new Error("Not implemented");
  }

  async revoke(id, manager = null) {
    throw new Error("revoke() not implemented.");
  }

  async delete(id, manager = null) {
    throw new Error("delete() not implemented.");
  }
}
