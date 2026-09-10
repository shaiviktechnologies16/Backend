import { PlanRepositoryImpl } from "./infrastructure/repositories/plan.repository.impl.js";

import { CreatePlanUseCase } from "./application/use-cases/create-plan.usecase.js";
import { GetPlanUseCase } from "./application/use-cases/get-plan.usecase.js";
import { GetPlansUseCase } from "./application/use-cases/get-plans.usecase.js";
import { UpdatePlanUseCase } from "./application/use-cases/update-plan.usecase.js";
import { DeletePlanUseCase } from "./application/use-cases/delete-plan.usecase.js";
import { UpdatePlanUsageLimitUseCase } from "./application/use-cases/update-plan-usage-limit.usecase.js";
import { CheckPlanUsageUseCase } from "./application/use-cases/check-plan-usage.usecase.js";
import { AssignPlanToOrganizationUseCase } from "./application/use-cases/assign-plan-to-organization.usecase.js";
import { EntitlementService } from "./application/services/entitlement.service.js";

import { PlanController } from "./presentation/controllers/plan.controller.js";

export function createPlansModule({
  dataSource,
  invoiceService,
  organizationModelEntitlementService,
}) {
  const planRepository = new PlanRepositoryImpl(dataSource);

  const entitlementService = new EntitlementService({
    dataSource,
    planRepository,
    organizationModelEntitlementService,
  });

  const createPlanUseCase = new CreatePlanUseCase(planRepository);
  const getPlanUseCase = new GetPlanUseCase(planRepository);
  const getPlansUseCase = new GetPlansUseCase(planRepository);
  const updatePlanUseCase = new UpdatePlanUseCase(planRepository);
  const deletePlanUseCase = new DeletePlanUseCase(planRepository);

  const updatePlanUsageLimitUseCase = new UpdatePlanUsageLimitUseCase(
    planRepository,
  );

  const assignPlanToOrganizationUseCase = new AssignPlanToOrganizationUseCase(
    planRepository,
  );

  const checkPlanUsageUseCase = new CheckPlanUsageUseCase({
    planRepository,
  });

  const planController = new PlanController({
    createPlanUseCase,
    getPlanUseCase,
    getPlansUseCase,
    updatePlanUseCase,
    deletePlanUseCase,
    updatePlanUsageLimitUseCase,
    assignPlanToOrganizationUseCase,
    entitlementService,
    invoiceService,
  });

  return {
    planRepository,
    entitlementService,
    createPlanUseCase,
    getPlanUseCase,
    getPlansUseCase,
    updatePlanUseCase,
    deletePlanUseCase,
    updatePlanUsageLimitUseCase,
    assignPlanToOrganizationUseCase,
    checkPlanUsageUseCase,
    planController,
  };
}
