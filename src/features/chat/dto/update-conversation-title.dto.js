export class UpdateConversationTitleDto {
  constructor({ title }) {
    this.title = title?.trim();
  }

  validate() {
    if (!this.title) {
      throw new AppError("Title is required.", 400, "TITLE_REQUIRED");
    }

    if (this.title.length > 100) {
      throw new AppError(
        "Title cannot exceed 100 characters.",
        400,
        "TITLE_TOO_LONG",
      );
    }

    return this;
  }
}
