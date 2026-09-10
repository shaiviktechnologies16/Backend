export class CompanyProfileEntity {
  constructor({
    id,
    organizationId,
    companyName,
    logo,
    coverImage,
    tagline,
    website,
    description,
    email,
    phone,
    alternatePhone,
    street,
    area,
    city,
    state,
    country,
    postalCode,
    industry,
    companySize,
    foundedYear,
    businessType,
    timezone,
    currency,
    language,
    linkedin,
    twitter,
    instagram,
    facebook,
    youtube,
    primaryColor,
    secondaryColor,
    accentColor,
    createdAt,
    updatedAt,
  }) {
    this.id = id;
    this.organizationId = organizationId;

    this.companyName = companyName;
    this.logo = logo;
    this.coverImage = coverImage;
    this.tagline = tagline;
    this.website = website;
    this.description = description;

    this.email = email;
    this.phone = phone;
    this.alternatePhone = alternatePhone;

    this.street = street;
    this.area = area;
    this.city = city;
    this.state = state;
    this.country = country;
    this.postalCode = postalCode;

    this.industry = industry;
    this.companySize = companySize;
    this.foundedYear = foundedYear;
    this.businessType = businessType;
    this.timezone = timezone;
    this.currency = currency;
    this.language = language;

    this.linkedin = linkedin;
    this.twitter = twitter;
    this.instagram = instagram;
    this.facebook = facebook;
    this.youtube = youtube;

    this.primaryColor = primaryColor;
    this.secondaryColor = secondaryColor;
    this.accentColor = accentColor;

    this.createdAt = createdAt;
    this.updatedAt = updatedAt;

    Object.freeze(this);
  }
}
