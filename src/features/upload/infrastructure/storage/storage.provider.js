export class StorageProvider {
  async upload({
    buffer,
    originalName,
    mimeType,
    size,
    purpose,
    userId,
    organizationId,
    projectId,
  }) {
    throw new Error("StorageProvider.upload() must be implemented.");
  }

  async delete() {
    throw new Error("StorageProvider.delete() must be implemented.");
  }

  async getUrl() {
    throw new Error("StorageProvider.getUrl() must be implemented.");
  }

  async downloadToTemp(uploadRecord, targetFilePath) {
    throw new Error("StorageProvider.downloadToTemp() must be implemented.");
  }
}
