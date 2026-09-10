import { KnowledgeSourceRepositoryImpl } from "./infrastructure/repositories/knowledge-source.repository.impl.js";

import { CreateKnowledgeSourceUseCase } from "./application/use-cases/create-knowledge-source.usecase.js";
import { GetKnowledgeSourceUseCase } from "./application/use-cases/get-knowledge-source.usecase.js";
import { GetProjectKnowledgeSourcesUseCase } from "./application/use-cases/get-project-knowledge-sources.usecase.js";
import { UpdateKnowledgeSourceUseCase } from "./application/use-cases/update-knowledge-source.usecase.js";
import { DeleteKnowledgeSourceUseCase } from "./application/use-cases/delete-knowledge-source.usecase.js";
import { KnowledgeChunkRepositoryImpl } from "./infrastructure/repositories/knowledge-chunk.repository.impl.js";
import { TextChunkingService } from "./application/services/text-chunking.service.js";
import { IngestKnowledgeSourceUseCase } from "./application/use-cases/ingest-knowledge-source.usecase.js";
import { KnowledgeSearchService } from "./application/services/knowledge-search.service.js";
import { SearchKnowledgeUseCase } from "./application/use-cases/search-knowledge.usecase.js";

import { KnowledgeSourceController } from "./presentation/controllers/knowledge-source.controller.js";

export const createKnowledgeModule = ({
  dataSource,
  checkProjectAccessUseCase,
  aiModelRepository,
  getPlatformConfigUseCase,
  embeddingProviderFactory,
}) => {
  const knowledgeSourceRepository = new KnowledgeSourceRepositoryImpl(
    dataSource,
  );

  const knowledgeChunkRepository = new KnowledgeChunkRepositoryImpl(dataSource);

  const textChunkingService = new TextChunkingService();
  const knowledgeSearchService = new KnowledgeSearchService({
    knowledgeChunkRepository,
    aiModelRepository,
    getPlatformConfigUseCase,
    embeddingProviderFactory,
  });
  const searchKnowledgeUseCase = new SearchKnowledgeUseCase({
    knowledgeSearchService,
    checkProjectAccessUseCase,
    getPlatformConfigUseCase,
  });
  const ingestKnowledgeSourceUseCase = new IngestKnowledgeSourceUseCase({
    knowledgeSourceRepository,
    knowledgeChunkRepository,
    textChunkingService,
    checkProjectAccessUseCase,
    aiModelRepository,
    embeddingProviderFactory,
  });
  const createKnowledgeSourceUseCase = new CreateKnowledgeSourceUseCase({
    knowledgeSourceRepository,
    checkProjectAccessUseCase,
  });

  const getKnowledgeSourceUseCase = new GetKnowledgeSourceUseCase({
    knowledgeSourceRepository,
    checkProjectAccessUseCase,
  });

  const getProjectKnowledgeSourcesUseCase =
    new GetProjectKnowledgeSourcesUseCase({
      knowledgeSourceRepository,
      checkProjectAccessUseCase,
    });

  const updateKnowledgeSourceUseCase = new UpdateKnowledgeSourceUseCase({
    knowledgeSourceRepository,
    checkProjectAccessUseCase,
  });

  const deleteKnowledgeSourceUseCase = new DeleteKnowledgeSourceUseCase({
    knowledgeSourceRepository,
    checkProjectAccessUseCase,
  });

  const knowledgeSourceController = new KnowledgeSourceController({
    createKnowledgeSourceUseCase,
    getKnowledgeSourceUseCase,
    getProjectKnowledgeSourcesUseCase,
    updateKnowledgeSourceUseCase,
    deleteKnowledgeSourceUseCase,
    ingestKnowledgeSourceUseCase,
    searchKnowledgeUseCase,
  });

  return {
    knowledgeSourceRepository,
    knowledgeChunkRepository,
    textChunkingService,
    knowledgeSearchService,
    searchKnowledgeUseCase,
    ingestKnowledgeSourceUseCase,
    createKnowledgeSourceUseCase,
    getKnowledgeSourceUseCase,
    getProjectKnowledgeSourcesUseCase,
    updateKnowledgeSourceUseCase,
    deleteKnowledgeSourceUseCase,
    knowledgeSourceController,
  };
};
