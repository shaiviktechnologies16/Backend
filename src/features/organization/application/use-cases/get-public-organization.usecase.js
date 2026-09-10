import { AppError } from "../../../../common/errors/AppError.js";

export class GetPublicOrganizationUseCase {
  constructor({ organizationRepository, companyProfileRepository }) {
    this.organizationRepository = organizationRepository;
    this.companyProfileRepository = companyProfileRepository;
  }

  async execute(organizationId) {
    const organization =
      await this.organizationRepository.findById(organizationId);

    if (!organization) {
      throw new AppError(
        "Organization not found.",
        404,
        "ORGANIZATION_NOT_FOUND",
      );
    }

    const companyProfile =
      await this.companyProfileRepository.findByOrganizationId(organizationId);

    if (!companyProfile) {
      throw new AppError(
        "Company profile not found.",
        404,
        "COMPANY_PROFILE_NOT_FOUND",
      );
    }

    return {
      id: organization.id,
      name: companyProfile.companyName ?? organization.name,
      slug: organization.slug,

      logo: companyProfile.logo ?? organization.logo,
      coverImage: companyProfile.coverImage,
      tagline: companyProfile.tagline,
      website: companyProfile.website ?? organization.website,
      description: companyProfile.description ?? organization.description,

      contact: {
        email: companyProfile.email,
        phone: companyProfile.phone,
        alternatePhone: companyProfile.alternatePhone,
      },

      address: {
        street: companyProfile.street,
        area: companyProfile.area,
        city: companyProfile.city,
        state: companyProfile.state,
        country: companyProfile.country,
        postalCode: companyProfile.postalCode,
      },

      business: {
        industry: companyProfile.industry,
        companySize: companyProfile.companySize,
        foundedYear: companyProfile.foundedYear,
        businessType: companyProfile.businessType,
      },

      localization: {
        timezone: companyProfile.timezone,
        currency: companyProfile.currency,
        language: companyProfile.language,
      },

      socialLinks: {
        linkedin: companyProfile.linkedin,
        twitter: companyProfile.twitter,
        instagram: companyProfile.instagram,
        facebook: companyProfile.facebook,
        youtube: companyProfile.youtube,
      },

      branding: {
        primaryColor: companyProfile.primaryColor,
        secondaryColor: companyProfile.secondaryColor,
        accentColor: companyProfile.accentColor,
      },
    };
  }
}
