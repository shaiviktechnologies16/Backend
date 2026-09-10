export class UploadDto {
  constructor({
    purpose,
    organizationId = null,
    projectId = null,
    sourceUrl = null,
    file = null,
    metadata = null,
  }) {
    this.purpose = purpose;
    this.organizationId = organizationId;
    this.projectId = projectId;
    this.sourceUrl = sourceUrl;
    this.file = file;
    this.metadata = metadata;
  }
}
