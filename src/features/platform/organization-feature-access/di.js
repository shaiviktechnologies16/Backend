import { OrganizationFeatureAccessRepositoryImpl } from "./infrastructure/repositories/organization-feature-access.repository.impl.js";
import { GetOrganizationFeatureAccessUseCase } from "./application/use-cases/get-organization-feature-access.usecase.js";
import { UpdateOrganizationFeatureAccessUseCase } from "./application/use-cases/update-organization-feature-access.usecase.js";
import { OrganizationFeatureAccessController } from "./presentation/controllers/organization-feature-access.controller.js";
import { WorkspaceFeatureAccessController } from "./presentation/controllers/workspace-feature-access.controller.js";
export const createOrganizationFeatureAccessModule = ({ dataSource }) => {
  const organizationFeatureAccessRepository =
    new OrganizationFeatureAccessRepositoryImpl(dataSource);

  const getOrganizationFeatureAccessUseCase =
    new GetOrganizationFeatureAccessUseCase({
      organizationFeatureAccessRepository,
    });

  const updateOrganizationFeatureAccessUseCase =
    new UpdateOrganizationFeatureAccessUseCase({
      organizationFeatureAccessRepository,
    });

  const organizationFeatureAccessController =
    new OrganizationFeatureAccessController({
      getOrganizationFeatureAccessUseCase,
      updateOrganizationFeatureAccessUseCase,
    });

  const workspaceFeatureAccessController = new WorkspaceFeatureAccessController(
    {
      getOrganizationFeatureAccessUseCase,
    },
  );

  return {
    organizationFeatureAccessRepository,
    getOrganizationFeatureAccessUseCase,
    updateOrganizationFeatureAccessUseCase,
    organizationFeatureAccessController,
    workspaceFeatureAccessController,
  };
};
