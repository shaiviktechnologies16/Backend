import express from "express";
import { uploadCharacterReferenceMiddleware } from "../middleware/character-upload.middleware.js";

export const createAiVideoRoutes = ({
  videoProjectController,
  videoCharacterController,
  videoSceneController,
  aiDirectorController,
  authMiddleware,
  workspaceContextMiddleware = null,
}) => {
  const router = express.Router();

  const middlewareList = [authMiddleware];
  if (workspaceContextMiddleware) {
    if (Array.isArray(workspaceContextMiddleware)) {
      middlewareList.push(...workspaceContextMiddleware);
    } else {
      middlewareList.push(workspaceContextMiddleware);
    }
  }

  router.use(middlewareList);

  // --- Project Routes ---
  router.post("/projects", videoProjectController.create);
  router.get("/projects", videoProjectController.list);
  router.get("/projects/:projectId", videoProjectController.get);
  router.delete("/projects/:projectId", videoProjectController.delete);

  // --- Character Routes ---
  router.post(
    "/characters/reference-image",
    uploadCharacterReferenceMiddleware,
    videoCharacterController.uploadReferenceImage,
  );
  router.post("/characters", videoCharacterController.create);
  router.get("/characters", videoCharacterController.list);
  router.get("/characters/:characterId", videoCharacterController.get);

  // --- Scene Routes ---
  router.post("/projects/:projectId/scenes", videoSceneController.create);
  router.patch("/scenes/:sceneId", videoSceneController.update);
  router.delete("/scenes/:sceneId", videoSceneController.delete);
  router.patch("/scenes/:sceneId/status", videoSceneController.updateStatus);

  // --- Scene Video Generation Routes (Primary Animated Video Pipeline) ---
  router.post("/projects/:projectId/scenes/videos", videoSceneController.generateAllVideos);
  router.post("/projects/:projectId/scenes/:sceneNumber/video", videoSceneController.generateVideo);
  router.post("/scenes/:sceneId/video", videoSceneController.generateVideo);

  // --- Scene Image Generation Routes (Optional Preview) ---
  router.post("/projects/:projectId/scenes/images", videoSceneController.generateAllImages);
  router.post("/projects/:projectId/scenes/:sceneNumber/image", videoSceneController.generateImage);
  router.post("/scenes/:sceneId/image", videoSceneController.generateImage);

  // --- Generation Stages (Orchestration) ---
  router.post("/projects/:projectId/scenes/:sceneId/stages/:stage", videoSceneController.executeStage);
  router.post("/projects/:projectId/scenes/:sceneId/stages/:stage/retry", videoSceneController.retryStage);

  // --- AI Director Routes ---
  router.post("/projects/:projectId/script", aiDirectorController.generateScript);
  router.post("/projects/:projectId/storyboard", aiDirectorController.generateStoryboard);
  router.get("/projects/:projectId/progress", aiDirectorController.getProgress);

  return router;
};

export default createAiVideoRoutes;
