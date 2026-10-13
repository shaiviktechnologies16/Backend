import { WorkspaceModelRepository } from "../../domain/repositories/workspace-model.repository.js";

export class WorkspaceModelRepositoryImpl extends WorkspaceModelRepository {
  constructor(dataSource, organizationModelEntitlementService = null) {
    super();

    this.repository = dataSource.getRepository("OrganizationModelAccess");
    this.organizationModelEntitlementService =
      organizationModelEntitlementService;
  }

  async findAvailableModels(organizationId) {
    let accesses = await this.repository.find({
      where: {
        organizationId,
        aiModel: {
          status: "ACTIVE",
        },
      },
      relations: {
        aiModel: true,
      },
    });

    if (
      (!accesses || accesses.length === 0) &&
      this.organizationModelEntitlementService
    ) {
      try {
        await this.organizationModelEntitlementService.syncOrganizationModelEntitlements(
          {
            organizationId,
          },
        );
        accesses = await this.repository.find({
          where: {
            organizationId,
            aiModel: {
              status: "ACTIVE",
            },
          },
          relations: {
            aiModel: true,
          },
        });
      } catch (syncErr) {
        console.error(
          "Failed to auto-seed organization model entitlements in workspace repository:",
          syncErr,
        );
      }
    }

    return accesses.map((access) => ({
      id: access.aiModel.id,
      provider: access.aiModel.provider,
      model: access.aiModel.model,
      displayName: access.aiModel.displayName,
      description: access.aiModel.description,
      status: access.aiModel.status,
      capability: access.aiModel.capability,
    }));
  }
}
