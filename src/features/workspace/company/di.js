import { CompanyProfileRepositoryImpl } from "./infrastructure/repositories/company-profile.repository.impl.js";

import { GetCompanyProfileUseCase } from "./application/use-cases/get-company-profile.usecase.js";
import { UpdateCompanyProfileUseCase } from "./application/use-cases/update-company-profile.usecase.js";

import { CompanyProfileController } from "./presentation/controllers/company-profile.controller.js";

export function createCompanyProfileModule({
  dataSource,
  organizationRepository = null,
  contextMiddleware,
}) {
  const companyProfileRepository = new CompanyProfileRepositoryImpl(dataSource);

  const getCompanyProfileUseCase = new GetCompanyProfileUseCase({
    companyProfileRepository,
    organizationRepository,
  });

  const updateCompanyProfileUseCase = new UpdateCompanyProfileUseCase({
    companyProfileRepository,
  });

  const companyProfileController = new CompanyProfileController({
    getCompanyProfileUseCase,
    updateCompanyProfileUseCase,
  });

  return {
    companyProfileRepository,
    getCompanyProfileUseCase,
    updateCompanyProfileUseCase,
    companyProfileController,
    contextMiddleware,
  };
}
