export class UpdateCompanyProfileDto {
  constructor(payload = {}) {
    this.companyName = payload.companyName;
    this.logo = payload.logo;
    this.coverImage = payload.coverImage;
    this.tagline = payload.tagline;
    this.website = payload.website;
    this.description = payload.description;

    this.email = payload.email;
    this.phone = payload.phone;
    this.alternatePhone = payload.alternatePhone;

    this.street = payload.street;
    this.area = payload.area;
    this.city = payload.city;
    this.state = payload.state;
    this.country = payload.country;
    this.postalCode = payload.postalCode;

    this.industry = payload.industry;
    this.companySize = payload.companySize;
    this.foundedYear = payload.foundedYear;
    this.businessType = payload.businessType;
    this.timezone = payload.timezone;
    this.currency = payload.currency;
    this.language = payload.language;

    this.linkedin = payload.linkedin;
    this.twitter = payload.twitter;
    this.instagram = payload.instagram;
    this.facebook = payload.facebook;
    this.youtube = payload.youtube;

    this.primaryColor = payload.primaryColor;
    this.secondaryColor = payload.secondaryColor;
    this.accentColor = payload.accentColor;
  }

  toUpdateObject() {
    const data = {};

    const fields = [
      "companyName",
      "logo",
      "coverImage",
      "tagline",
      "website",
      "description",
      "email",
      "phone",
      "alternatePhone",
      "street",
      "area",
      "city",
      "state",
      "country",
      "postalCode",
      "industry",
      "companySize",
      "foundedYear",
      "businessType",
      "timezone",
      "currency",
      "language",
      "linkedin",
      "twitter",
      "instagram",
      "facebook",
      "youtube",
      "primaryColor",
      "secondaryColor",
      "accentColor",
    ];

    for (const field of fields) {
      if (this[field] !== undefined) {
        data[field] = this[field];
      }
    }

    return data;
  }
}
