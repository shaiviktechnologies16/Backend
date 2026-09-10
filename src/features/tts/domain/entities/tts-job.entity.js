import { EntitySchema } from "typeorm";

export const TtsJobOrm = new EntitySchema({
  name: "TtsJob",

  tableName: "tts_jobs",

  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
      default: () => "uuid_generate_v4()",
    },

    userId: {
      name: "user_id",
      type: "uuid",
      nullable: false,
    },

    text: {
      type: "text",
    },

    status: {
      type: "varchar",
      length: 30,
      default: "queued",
    },

    totalGroups: {
      name: "total_groups",
      type: "int",
      default: 0,
    },

    completedGroups: {
      name: "completed_groups",
      type: "int",
      default: 0,
    },

    progress: {
      type: "int",
      default: 0,
    },

    outputPath: {
      name: "output_path",
      type: "text",
      nullable: true,
    },

    outputFilename: {
      name: "output_filename",
      type: "varchar",
      length: 255,
      nullable: true,
    },

    options: {
      type: "jsonb",
      nullable: true,
    },

    errorMessage: {
      name: "error_message",
      type: "text",
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
