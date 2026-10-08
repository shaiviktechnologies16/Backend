export class VideoSceneRepository {
  async create(sceneData) {
    throw new Error("Method not implemented.");
  }

  async findById(id) {
    throw new Error("Method not implemented.");
  }

  async findByProjectId(videoProjectId) {
    throw new Error("Method not implemented.");
  }

  async findByProjectAndNumber(videoProjectId, sceneNumber) {
    throw new Error("Method not implemented.");
  }

  async update(id, updateData) {
    throw new Error("Method not implemented.");
  }

  async updateStatus(id, status, extraPayload = {}) {
    throw new Error("Method not implemented.");
  }

  async delete(id) {
    throw new Error("Method not implemented.");
  }

  async deleteByProjectId(videoProjectId) {
    throw new Error("Method not implemented.");
  }
}
