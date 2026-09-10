export class OrganizationMemberController {
  constructor(
    addMemberUseCase,
    getOrganizationMembersUseCase,
    updateMemberRoleUseCase,
    removeMemberUseCase,
    getMemberPermissionsUseCase,
    updateMemberPermissionsUseCase,
    getEnquiryNotificationRecipientsUseCase,
    updateEnquiryNotificationRecipientsUseCase,
  ) {
    this.addMemberUseCase = addMemberUseCase;
    this.getOrganizationMembersUseCase = getOrganizationMembersUseCase;
    this.updateMemberRoleUseCase = updateMemberRoleUseCase;
    this.removeMemberUseCase = removeMemberUseCase;
    this.getMemberPermissionsUseCase = getMemberPermissionsUseCase;
    this.updateMemberPermissionsUseCase = updateMemberPermissionsUseCase;
    this.getEnquiryNotificationRecipientsUseCase =
      getEnquiryNotificationRecipientsUseCase;
    this.updateEnquiryNotificationRecipientsUseCase =
      updateEnquiryNotificationRecipientsUseCase;

    this.addMember = this.addMember.bind(this);
    this.getMembers = this.getMembers.bind(this);
    this.updateMemberRole = this.updateMemberRole.bind(this);
    this.removeMember = this.removeMember.bind(this);
    this.getMemberPermissions = this.getMemberPermissions.bind(this);
    this.updateMemberPermissions = this.updateMemberPermissions.bind(this);
    this.getEnquiryNotificationRecipients =
      this.getEnquiryNotificationRecipients.bind(this);
    this.updateEnquiryNotificationRecipients =
      this.updateEnquiryNotificationRecipients.bind(this);
  }

  async addMember(req, res, next) {
    try {
      const member = await this.addMemberUseCase.execute({
        organizationId: req.body.organizationId,
        email: req.body.email,
        role: req.body.role,
        invitedBy: req.user.id,
      });

      return res.status(201).json({
        message: "Member added successfully.",
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMembers(req, res, next) {
    try {
      const members = await this.getOrganizationMembersUseCase.execute(
        req.query.organizationId,
      );

      return res.status(200).json({
        message: "Organization members fetched successfully.",
        data: members,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateMemberRole(req, res, next) {
    try {
      const member = await this.updateMemberRoleUseCase.execute({
        organizationId: req.body.organizationId,
        userId: req.params.userId,
        role: req.body.role,
      });

      return res.status(200).json({
        message: "Member role updated successfully.",
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }

  async removeMember(req, res, next) {
    try {
      const result = await this.removeMemberUseCase.execute({
        organizationId: req.body.organizationId,
        userId: req.params.userId,
      });

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getMemberPermissions(req, res, next) {
    try {
      const result = await this.getMemberPermissionsUseCase.execute({
        organizationId: req.query.organizationId,
        userId: req.params.userId,
      });

      return res.status(200).json({
        message: "Member permissions fetched successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateMemberPermissions(req, res, next) {
    try {
      const result = await this.updateMemberPermissionsUseCase.execute({
        organizationId: req.body.organizationId,
        userId: req.params.userId,
        permissionIds: req.body.permissionIds || [],
      });

      return res.status(200).json({
        message: "Member permissions updated successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getEnquiryNotificationRecipients(req, res, next) {
    try {
      const result = await this.getEnquiryNotificationRecipientsUseCase.execute(
        {
          organizationId: req.query.organizationId,
        },
      );

      return res.status(200).json({
        message: "Enquiry notification recipients fetched successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateEnquiryNotificationRecipients(req, res, next) {
    try {
      const result =
        await this.updateEnquiryNotificationRecipientsUseCase.execute({
          organizationId: req.body.organizationId,
          recipients: req.body.recipients || [],
        });

      return res.status(200).json({
        message: "Enquiry notification recipients updated successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
