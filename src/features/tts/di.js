import { AppDataSource } from "../../database/datasource.js";

import { createTTSController } from "./controller/tts.controller.js";
import { createTtsJobController } from "./presentation/controllers/tts-job.controller.js";

import { TtsJobRepository } from "./domain/repositories/tts-job.repository.js";
import { CreateTtsJobUseCase } from "./domain/use-cases/create-tts-job.use-case.js";
import { GetTtsJobUseCase } from "./domain/use-cases/get-tts-job.use-case.js";

import { TtsJobProcessor } from "./service/tts-job.processor.js";

export function createTTSModule({ synthesizeSpeechUseCase }) {
  if (!synthesizeSpeechUseCase) {
    throw new Error("TTS module requires synthesizeSpeechUseCase.");
  }

  const controller = createTTSController({
    synthesizeSpeechUseCase,
  });

  const ttsJobRepository = new TtsJobRepository({
    dataSource: AppDataSource,
  });

  const createTtsJobUseCase = new CreateTtsJobUseCase({
    ttsJobRepository,
  });

  const getTtsJobUseCase = new GetTtsJobUseCase({
    ttsJobRepository,
  });

  const ttsJobProcessor = new TtsJobProcessor({
    ttsJobRepository,
    synthesizeSpeechUseCase,
  });

  const jobController = createTtsJobController({
    createTtsJobUseCase,
    getTtsJobUseCase,
    ttsJobRepository,
    ttsJobProcessor,
  });

  return {
    controller,
    jobController,
    synthesizeSpeechUseCase,
    ttsJobRepository,
    createTtsJobUseCase,
    getTtsJobUseCase,
    ttsJobProcessor,
  };
}
