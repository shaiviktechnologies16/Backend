export class NormalizeConversationAndMessageTimestampsToUtc1730001400000 {
  name = "NormalizeConversationAndMessageTimestampsToUtc1730001400000";

  async up(queryRunner) {
    const hasConversations = await queryRunner.hasTable("conversations");
    const hasMessages = await queryRunner.hasTable("messages");

    if (hasConversations) {
      // 1. Normalize conversation updated_at where local IST offset (+5:30) was stored
      await queryRunner.query(`
        UPDATE conversations
        SET updated_at = updated_at - INTERVAL '5 hours 30 minutes'
        WHERE updated_at IS NOT NULL
          AND created_at IS NOT NULL
          AND (updated_at - created_at) BETWEEN INTERVAL '5 hours 25 minutes' AND INTERVAL '5 hours 35 minutes';
      `);

      // 2. Normalize conversations completed by system daily closure today in local time
      await queryRunner.query(`
        UPDATE conversations
        SET completed_at = completed_at - INTERVAL '5 hours 30 minutes',
            updated_at = updated_at - INTERVAL '5 hours 30 minutes'
        WHERE is_completed = true
          AND completed_at IS NOT NULL
          AND completed_at::text LIKE '2026-10-18 14:09%';
      `);
    }

    if (hasMessages && hasConversations) {
      // 3. Normalize messages whose created_at was stored with local IST offset
      await queryRunner.query(`
        UPDATE messages
        SET created_at = messages.created_at - INTERVAL '5 hours 30 minutes'
        FROM conversations
        WHERE messages.conversation_id = conversations.id
          AND messages.created_at > conversations.created_at + INTERVAL '5 hours';
      `);
    }

    if (hasConversations) {
      // 4. Alter conversation timestamp columns to TIMESTAMPTZ in UTC
      await queryRunner.query(`
        ALTER TABLE conversations
          ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
          ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC',
          ALTER COLUMN completed_at TYPE TIMESTAMPTZ USING completed_at AT TIME ZONE 'UTC',
          ALTER COLUMN handover_requested_at TYPE TIMESTAMPTZ USING handover_requested_at AT TIME ZONE 'UTC';
      `);
    }

    if (hasMessages) {
      // 5. Alter messages timestamp column to TIMESTAMPTZ in UTC
      await queryRunner.query(`
        ALTER TABLE messages
          ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
      `);
    }
  }

  async down(queryRunner) {
    const hasConversations = await queryRunner.hasTable("conversations");
    const hasMessages = await queryRunner.hasTable("messages");

    if (hasConversations) {
      await queryRunner.query(`
        ALTER TABLE conversations
          ALTER COLUMN created_at TYPE timestamp without time zone,
          ALTER COLUMN updated_at TYPE timestamp without time zone,
          ALTER COLUMN completed_at TYPE timestamp without time zone,
          ALTER COLUMN handover_requested_at TYPE timestamp without time zone;
      `);
    }

    if (hasMessages) {
      await queryRunner.query(`
        ALTER TABLE messages
          ALTER COLUMN created_at TYPE timestamp without time zone;
      `);
    }
  }
}

