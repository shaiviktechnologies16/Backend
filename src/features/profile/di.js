import { GetProfileUseCase } from "./application/use-cases/get-profile.usecase.js";
import { UpdateProfileUseCase } from "./application/use-cases/update-profile.usecase.js";
import { UpdateProfilePhotoUseCase } from "./application/use-cases/update-profile-photo.usecase.js";
import { ProfileController } from "./presentation/controllers/profile.controller.js";

export function createProfileModule({
  userRepository,
  organizationRepository,
  organizationMemberRepository,
  projectRepository,
  projectMemberRepository,
  workspaceMemberPermissionRepository,
  rbacRepository,
  uploadRepository,
  uploadFileUseCase,
}) {
  const getProfileUseCase = new GetProfileUseCase({
    userRepository,
    organizationRepository,
    organizationMemberRepository,
    projectRepository,
    projectMemberRepository,
    workspaceMemberPermissionRepository,
    rbacRepository,
    uploadRepository,
  });

  const updateProfileUseCase = new UpdateProfileUseCase({
    userRepository,
  });

  const updateProfilePhotoUseCase = new UpdateProfilePhotoUseCase({
    userRepository,
    uploadFileUseCase,
  });

  const profileController = new ProfileController({
    getProfileUseCase,
    updateProfileUseCase,
    updateProfilePhotoUseCase,
  });

  return {
    profileController,
  };
}
