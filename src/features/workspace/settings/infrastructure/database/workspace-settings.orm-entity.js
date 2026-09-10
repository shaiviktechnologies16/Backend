import { EntitySchema } from "typeorm";

export const WorkspaceSettingsOrmEntity = new EntitySchema({
  name: "WorkspaceSettings",
  tableName: "workspace_settings",

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

    assistantName: {
      name: "assistant_name",
      type: "varchar",
      length: 255,
      nullable: true,
    },

    assistantDescription: {
      name: "assistant_description",
      type: "text",
      nullable: true,
    },

    systemPrompt: {
      name: "system_prompt",
      type: "text",
      nullable: true,
    },

    themeConfig: {
      name: "theme_config",
      type: "jsonb",
      nullable: true,
    },

    featureFlags: {
      name: "feature_flags",
      type: "jsonb",
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
