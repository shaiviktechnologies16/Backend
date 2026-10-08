import { EntitySchema } from "typeorm";

export const VideoSceneOrmEntity = new EntitySchema({
  name: "VideoScene",
  tableName: "ai_video_scenes",
  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
      default: () => "uuid_generate_v4()",
    },

    videoProjectId: {
      propertyName: "videoProjectId",
      name: "video_project_id",
      type: "uuid",
      nullable: false,
    },

    sceneNumber: {
      propertyName: "sceneNumber",
      name: "scene_number",
      type: "int",
      nullable: false,
    },

    duration: {
      type: "int",
      nullable: false,
      default: 5,
    },

    visualPrompt: {
      propertyName: "visualPrompt",
      name: "visual_prompt",
      type: "text",
      nullable: true,
    },

    motionPrompt: {
      propertyName: "motionPrompt",
      name: "motion_prompt",
      type: "text",
      nullable: true,
    },

    dialogue: {
      type: "text",
      nullable: true,
    },

    speaker: {
      type: "varchar",
      length: 100,
      nullable: true,
    },

    characterIds: {
      propertyName: "characterIds",
      name: "character_ids",
      type: "jsonb",
      nullable: true,
    },

    referenceImageUrl: {
      propertyName: "referenceImageUrl",
      name: "reference_image_url",
      type: "text",
      nullable: true,
    },

    videoUrl: {
      propertyName: "videoUrl",
      name: "video_url",
      type: "text",
      nullable: true,
    },

    audioUrl: {
      propertyName: "audioUrl",
      name: "audio_url",
      type: "text",
      nullable: true,
    },

    status: {
      type: "varchar",
      length: 50,
      nullable: false,
      default: "PENDING",
    },

    errorMessage: {
      propertyName: "errorMessage",
      name: "error_message",
      type: "text",
      nullable: true,
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
