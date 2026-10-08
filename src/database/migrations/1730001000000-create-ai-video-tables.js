import { Table, TableForeignKey, TableIndex } from "typeorm";

export class CreateAiVideoTables1730001000000 {
  name = "CreateAiVideoTables1730001000000";

  async up(queryRunner) {
    // 1. ai_video_projects
    await queryRunner.createTable(
      new Table({
        name: "ai_video_projects",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "organization_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "project_id",
            type: "uuid",
            isNullable: true,
          },
          {
            name: "created_by_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "name",
            type: "varchar",
            length: "255",
            isNullable: false,
          },
          {
            name: "prompt",
            type: "text",
            isNullable: false,
          },
          {
            name: "language",
            type: "varchar",
            length: "20",
            default: "'te'",
            isNullable: false,
          },
          {
            name: "aspect_ratio",
            type: "varchar",
            length: "20",
            default: "'9:16'",
            isNullable: false,
          },
          {
            name: "duration",
            type: "int",
            default: 30,
            isNullable: false,
          },
          {
            name: "style",
            type: "varchar",
            length: "50",
            default: "'cartoon'",
            isNullable: false,
          },
          {
            name: "status",
            type: "varchar",
            length: "50",
            default: "'DRAFT'",
            isNullable: false,
          },
          {
            name: "script",
            type: "jsonb",
            isNullable: true,
          },
          {
            name: "storyboard",
            type: "jsonb",
            isNullable: true,
          },
          {
            name: "final_video_url",
            type: "text",
            isNullable: true,
          },
          {
            name: "error_message",
            type: "text",
            isNullable: true,
          },
          {
            name: "metadata",
            type: "jsonb",
            isNullable: true,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            isNullable: false,
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      "ai_video_projects",
      new TableIndex({
        name: "IDX_AI_VIDEO_PROJECTS_ORG_ID",
        columnNames: ["organization_id"],
      }),
    );

    // 2. ai_video_scenes
    await queryRunner.createTable(
      new Table({
        name: "ai_video_scenes",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "video_project_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "scene_number",
            type: "int",
            isNullable: false,
          },
          {
            name: "duration",
            type: "int",
            default: 5,
            isNullable: false,
          },
          {
            name: "visual_prompt",
            type: "text",
            isNullable: true,
          },
          {
            name: "motion_prompt",
            type: "text",
            isNullable: true,
          },
          {
            name: "dialogue",
            type: "text",
            isNullable: true,
          },
          {
            name: "speaker",
            type: "varchar",
            length: "100",
            isNullable: true,
          },
          {
            name: "character_ids",
            type: "jsonb",
            isNullable: true,
          },
          {
            name: "reference_image_url",
            type: "text",
            isNullable: true,
          },
          {
            name: "video_url",
            type: "text",
            isNullable: true,
          },
          {
            name: "audio_url",
            type: "text",
            isNullable: true,
          },
          {
            name: "status",
            type: "varchar",
            length: "50",
            default: "'PENDING'",
            isNullable: false,
          },
          {
            name: "error_message",
            type: "text",
            isNullable: true,
          },
          {
            name: "metadata",
            type: "jsonb",
            isNullable: true,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            isNullable: false,
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      "ai_video_scenes",
      new TableIndex({
        name: "IDX_AI_VIDEO_SCENES_PROJECT_ID",
        columnNames: ["video_project_id"],
      }),
    );

    await queryRunner.createForeignKey(
      "ai_video_scenes",
      new TableForeignKey({
        name: "FK_AI_VIDEO_SCENES_PROJECT",
        columnNames: ["video_project_id"],
        referencedTableName: "ai_video_projects",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );

    // 3. ai_video_characters
    await queryRunner.createTable(
      new Table({
        name: "ai_video_characters",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "organization_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "created_by_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "name",
            type: "varchar",
            length: "255",
            isNullable: false,
          },
          {
            name: "description",
            type: "text",
            isNullable: true,
          },
          {
            name: "reference_image_url",
            type: "text",
            isNullable: true,
          },
          {
            name: "style",
            type: "varchar",
            length: "50",
            default: "'cartoon'",
            isNullable: false,
          },
          {
            name: "metadata",
            type: "jsonb",
            isNullable: true,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            isNullable: false,
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      "ai_video_characters",
      new TableIndex({
        name: "IDX_AI_VIDEO_CHARACTERS_ORG_ID",
        columnNames: ["organization_id"],
      }),
    );

    // 4. ai_video_assets
    await queryRunner.createTable(
      new Table({
        name: "ai_video_assets",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "video_project_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "scene_id",
            type: "uuid",
            isNullable: true,
          },
          {
            name: "type",
            type: "varchar",
            length: "50",
            isNullable: false,
          },
          {
            name: "provider",
            type: "varchar",
            length: "50",
            default: "'system'",
            isNullable: false,
          },
          {
            name: "url",
            type: "text",
            isNullable: false,
          },
          {
            name: "storage_key",
            type: "text",
            isNullable: true,
          },
          {
            name: "mime_type",
            type: "varchar",
            length: "150",
            isNullable: true,
          },
          {
            name: "size",
            type: "bigint",
            isNullable: true,
          },
          {
            name: "metadata",
            type: "jsonb",
            isNullable: true,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            isNullable: false,
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      "ai_video_assets",
      new TableIndex({
        name: "IDX_AI_VIDEO_ASSETS_PROJECT_ID",
        columnNames: ["video_project_id"],
      }),
    );

    await queryRunner.createForeignKey(
      "ai_video_assets",
      new TableForeignKey({
        name: "FK_AI_VIDEO_ASSETS_PROJECT",
        columnNames: ["video_project_id"],
        referencedTableName: "ai_video_projects",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );
  }

  async down(queryRunner) {
    await queryRunner.dropTable("ai_video_assets", true);
    await queryRunner.dropTable("ai_video_characters", true);
    await queryRunner.dropTable("ai_video_scenes", true);
    await queryRunner.dropTable("ai_video_projects", true);
  }
}
