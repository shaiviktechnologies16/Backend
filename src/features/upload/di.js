import { TypeOrmUploadRepository } from "./infrastructure/repositories/typeorm-upload.repository.js";
import { CloudinaryStorageProvider } from "./infrastructure/storage/cloudinary-storage.provider.js";
import { UploadValidator } from "./domain/services/upload-validator.js";
import { UploadFileUseCase } from "./application/use-cases/upload-file.use-case.js";
import { UploadLinkUseCase } from "./application/use-cases/upload-link.use-case.js";
import { UploadController } from "./presentation/controllers/upload.controller.js";

export const createUploadModule = ({ dataSource }) => {
  const uploadRepository = new TypeOrmUploadRepository(dataSource);

  const uploadValidator = new UploadValidator();

  const storageProvider = new CloudinaryStorageProvider();

  const uploadFileUseCase = new UploadFileUseCase({
    uploadRepository,
    storageProvider,
    uploadValidator,
  });

  const uploadLinkUseCase = new UploadLinkUseCase({
    uploadRepository,
    uploadValidator,
  });

  const uploadController = new UploadController({
    uploadFileUseCase,
    uploadLinkUseCase,
  });

  return {
    uploadRepository,
    uploadValidator,
    storageProvider,
    uploadFileUseCase,
    uploadLinkUseCase,
    uploadController,
  };
};
