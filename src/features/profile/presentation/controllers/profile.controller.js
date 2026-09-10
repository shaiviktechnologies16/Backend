export class ProfileController {
  constructor({
    getProfileUseCase,
    updateProfileUseCase,
    updateProfilePhotoUseCase,
  }) {
    this.getProfileUseCase = getProfileUseCase;
    this.updateProfileUseCase = updateProfileUseCase;
    this.updateProfilePhotoUseCase = updateProfilePhotoUseCase;
  }

  getProfile = async (req, res, next) => {
    try {
      const profile = await this.getProfileUseCase.execute({
        userId: req.user.id,
        organizationMemberId: null,
      });

      return res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req, res, next) => {
    try {
      const user = await this.updateProfileUseCase.execute({
        userId: req.user.id,
        name: req.body.name,
        phone: req.body.phone,
      });

      return res.status(200).json({
        success: true,
        message: "Profile updated successfully.",
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          platformRole: user.platformRole,
          role: user.role,
          profilePhotoUploadId: user.profilePhotoUploadId,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  };
  updateProfilePhoto = async (req, res, next) => {
    try {
      const user = await this.updateProfilePhotoUseCase.execute({
        userId: req.user.id,
        file: req.file,
      });

      return res.status(200).json({
        success: true,
        message: "Profile photo updated successfully.",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };
}
