export class GetUploadsByPurposeUseCase {
  constructor({ uploadRepository, uploadValidator }) {
    this.uploadRepository = uploadRepository;
    this.uploadValidator = uploadValidator;
  }

  async execute({ purpose, userId = null, limit = 50, offset = 0 }) {
    if (purpose) {
      this.uploadValidator.validatePurpose(purpose);
    }

    return this.uploadRepository.findByPurpose({
      purpose,
      uploadedBy: userId,
      limit,
      offset,
    });
  }
}
