import { EntitySchema } from "typeorm";

export const VideoCharacterOrmEntity = new EntitySchema({
  name: "VideoCharacter",
  tableName: "ai_video_characters",
  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
      default: () => "uuid_generate_v4()",
    },

    organizationId: {
      propertyName: "organizationId",
      name: "organization_id",
      type: "uuid",
      nullable: false,
    },

    createdById: {
      propertyName: "createdById",
      name: "created_by_id",
      type: "uuid",
      nullable: false,
    },

    name: {
      type: "varchar",
      length: 255,
      nullable: false,
    },

    description: {
      type: "text",
      nullable: true,
    },

    referenceImageUrl: {
      propertyName: "referenceImageUrl",
      name: "reference_image_url",
      type: "text",
      nullable: true,
    },

    style: {
      type: "varchar",
      length: 50,
      nullable: false,
      default: "cartoon",
    },

    metadata: {
      type: "jsonb",
      nullable: true,
    },

    createdAt: {
      propertyName: "createdAt",
      name: "created_at",
      type: "timestamp",
      createDate: true,
    },

    updatedAt: {
      propertyName: "updatedAt",
      name: "updated_at",
      type: "timestamp",
      updateDate: true,
    },
  },
});
