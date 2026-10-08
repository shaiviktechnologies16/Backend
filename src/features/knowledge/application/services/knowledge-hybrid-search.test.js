import test from "node:test";
import assert from "node:assert/strict";

import { KnowledgeChunkRepositoryImpl } from "../../infrastructure/repositories/knowledge-chunk.repository.impl.js";

test("KnowledgeChunkRepositoryImpl.searchHybrid fuses vector and text search results using Reciprocal Rank Fusion (RRF)", async () => {
  const fakeDataSource = {
    getRepository() {
      return {};
    },
  };

  const repository = new KnowledgeChunkRepositoryImpl(fakeDataSource);

  // Mock searchSimilar (vector) and searchFullText (text/keyword)
  repository.searchSimilar = async () => [
    { id: "chunk-1", content: "Laptop troubleshooting guide", score: 0.95 },
    { id: "chunk-2", content: "General power issue", score: 0.82 },
  ];

  repository.searchFullText = async () => [
    {
      id: "chunk-3",
      content: "Error code ERR-504 description",
      text_rank: 0.99,
    },
    { id: "chunk-1", content: "Laptop troubleshooting guide", text_rank: 0.75 },
  ];

  const fused = await repository.searchHybrid({
    projectId: "proj-123",
    embedding: [0.1, 0.2],
    query: "ERR-504 laptop",
    limit: 5,
    rrfK: 60,
  });

  assert.equal(fused.length, 3);
  // chunk-1 appears in BOTH vector and text results, so its RRF score should be highest (1/61 + 1/62)
  assert.equal(fused[0].id, "chunk-1");
  assert.ok(fused[0].rrfScore > fused[1].rrfScore);
});
