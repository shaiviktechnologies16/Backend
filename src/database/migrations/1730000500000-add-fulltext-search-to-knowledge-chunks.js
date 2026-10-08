export class AddFulltextSearchToKnowledgeChunks1730000500000 {
  name = "AddFulltextSearchToKnowledgeChunks1730000500000";

  async up(queryRunner) {
    const hasTable = await queryRunner.hasTable("knowledge_chunks");

    if (hasTable) {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_content_fts
        ON knowledge_chunks
        USING gin(to_tsvector('english', content));
      `);
    }
  }

  async down(queryRunner) {
    const hasTable = await queryRunner.hasTable("knowledge_chunks");

    if (hasTable) {
      await queryRunner.query(`
        DROP INDEX IF EXISTS idx_knowledge_chunks_content_fts;
      `);
    }
  }
}
