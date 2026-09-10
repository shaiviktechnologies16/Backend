import { Router } from "express";

export default function createTTSRoutes({
  controller,
  jobController,
  middleware = [],
}) {
  const router = Router();

  if (middleware.length > 0) {
    router.use(middleware);
  }

  router.get("/config", jobController.getEngineConfig);
  router.put("/config", jobController.updateEngineConfig);
  router.post("/config", jobController.updateEngineConfig);

  router.get("/outputs", jobController.listOutputs);

  router.get("/outputs/:filename/audio", jobController.downloadOutputAudio);

  router.delete("/outputs/:filename", jobController.deleteOutput);

  router.post("/clone", jobController.cloneVoice);

  router.post("/", controller.synthesize);

  router.post("/jobs", jobController.create);

  router.get("/jobs/:id", jobController.getById);

  router.get("/jobs/:id/audio", jobController.downloadAudio);

  router.post("/batch-jobs", jobController.createBatchJob);

  router.get("/batch-jobs/:batchId", jobController.getBatchJob);

  router.get(
    "/batch-jobs/:batchId/download-zip",
    jobController.downloadBatchZip,
  );

  return router;
}
