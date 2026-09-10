import { EntitySchema } from "typeorm";

export const CompanyProfileOrmEntity = new EntitySchema({
  name: "CompanyProfile",
  tableName: "company_profiles",

  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },

    organizationId: {
      name: "organization_id",
      type: "uuid",
      unique: true,
    },

    companyName: {
      name: "company_name",
      type: "varchar",
      length: 255,
    },

    logo: {
      type: "text",
      nullable: true,
    },

    coverImage: {
      name: "cover_image",
      type: "text",
      nullable: true,
    },

    tagline: {
      type: "varchar",
      length: 255,
      nullable: true,
    },

    website: {
      type: "varchar",
      length: 255,
      nullable: true,
    },

    description: {
      type: "text",
      nullable: true,
    },

    email: {
      type: "varchar",
      length: 255,
      nullable: true,
    },

    phone: {
      type: "varchar",
      length: 50,
      nullable: true,
    },

    alternatePhone: {
      name: "alternate_phone",
      type: "varchar",
      length: 50,
      nullable: true,
    },

    street: {
      type: "varchar",
      length: 255,
      nullable: true,
    },

    area: {
      type: "varchar",
      length: 255,
      nullable: true,
    },

    city: {
      type: "varchar",
      length: 100,
      nullable: true,
    },

    state: {
      type: "varchar",
      length: 100,
      nullable: true,
    },

    country: {
      type: "varchar",
      length: 100,
      nullable: true,
    },

    postalCode: {
      name: "postal_code",
      type: "varchar",
      length: 20,
      nullable: true,
    },

    industry: {
      type: "varchar",
      length: 150,
      nullable: true,
    },

    companySize: {
      name: "company_size",
      type: "varchar",
      length: 50,
      nullable: true,
    },

    foundedYear: {
      name: "founded_year",
      type: "integer",
      nullable: true,
    },

    businessType: {
      name: "business_type",
      type: "varchar",
      length: 100,
      nullable: true,
    },

    timezone: {
      type: "varchar",
      length: 100,
      nullable: true,
    },

    currency: {
      type: "varchar",
      length: 10,
      nullable: true,
    },

    language: {
      type: "varchar",
      length: 20,
      nullable: true,
    },

    linkedin: {
      type: "varchar",
      length: 500,
      nullable: true,
    },

    twitter: {
      type: "varchar",
      length: 500,
      nullable: true,
    },

    instagram: {
      type: "varchar",
      length: 500,
      nullable: true,
    },

    facebook: {
      type: "varchar",
      length: 500,
      nullable: true,
    },

    youtube: {
      type: "varchar",
      length: 500,
      nullable: true,
    },

    primaryColor: {
      name: "primary_color",
      type: "varchar",
      length: 20,
      nullable: true,
    },

    secondaryColor: {
      name: "secondary_color",
      type: "varchar",
      length: 20,
      nullable: true,
    },

    accentColor: {
      name: "accent_color",
      type: "varchar",
      length: 20,
      nullable: true,
    },

    createdAt: {
      name: "created_at",
      type: "timestamp",
      createDate: true,
    },

    updatedAt: {
      name: "updated_at",
      type: "timestamp",
      updateDate: true,
    },
  },
});
