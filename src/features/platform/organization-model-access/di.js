import { OrganizationModelAccessRepositoryImpl } from "./infrastructure/repositories/organization-model-access.repository.impl.js";

import { AddModelAccessUseCase } from "./application/use-cases/add-model-access.usecase.js";
import { GetOrganizationModelsUseCase } from "./application/use-cases/get-organization-models.usecase.js";
import { RemoveModelAccessUseCase } from "./application/use-cases/remove-model-access.usecase.js";

import { OrganizationModelAccessController } from "./presentation/controllers/organization-model-access.controller.js";

export function createOrganizationModelAccessModule({
  dataSource,
  organizationModelEntitlementService = null,
  organizationRepository = null,
  aiModelRepository = null,
  onModelAccessChanged = null,
}) {
  const organizationModelAccessRepository =
    new OrganizationModelAccessRepositoryImpl(dataSource);

  const addModelAccessUseCase = new AddModelAccessUseCase({
    organizationModelAccessRepository,
    organizationRepository,
    aiModelRepository,
    onModelAccessChanged,
  });

  const getOrganizationModelsUseCase = new GetOrganizationModelsUseCase({
    organizationModelAccessRepository,
    organizationModelEntitlementService,
  });

  const removeModelAccessUseCase = new RemoveModelAccessUseCase({
    organizationModelAccessRepository,
    onModelAccessChanged,
  });

  const organizationModelAccessController =
    new OrganizationModelAccessController({
      addModelAccessUseCase,
      getOrganizationModelsUseCase,
      removeModelAccessUseCase,
    });

  return {
    organizationModelAccessRepository,
    addModelAccessUseCase,
    getOrganizationModelsUseCase,
    removeModelAccessUseCase,
    organizationModelAccessController,
  };
}
