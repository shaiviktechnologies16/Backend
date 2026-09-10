import { EntitySchema } from "typeorm";

import { InvitationStatus } from "../../features/organization-invitations/domain/constants/invitation-status.js";

export const OrganizationInvitationOrm = new EntitySchema({
  name: "OrganizationInvitation",

  tableName: "organization_invitations",

  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
      default: () => "uuid_generate_v4()",
    },

    organizationId: {
      name: "organization_id",
      type: "uuid",
    },

    email: {
      type: "varchar",
      length: 255,
    },

    role: {
      type: "varchar",
      length: 30,
    },

    token: {
      type: "varchar",
      length: 255,
      unique: true,
    },

    status: {
      type: "varchar",
      length: 30,
      default: InvitationStatus.PENDING,
    },

    expiresAt: {
      name: "expires_at",
      type: "timestamp",
    },

    acceptedAt: {
      name: "accepted_at",
      type: "timestamp",
      nullable: true,
    },

    createdBy: {
      name: "created_by",
      type: "uuid",
    },

    createdAt: {
      name: "created_at",
      type: "timestamp",
      createDate: true,
    },

    updatedAt: {
      name: "updated_at",
      type: "timestamp",
      updateDate: true,
    },
  },

  relations: {
    organization: {
      type: "many-to-one",
      target: "Organization",
      joinColumn: {
        name: "organization_id",
      },
      onDelete: "CASCADE",
    },
  },
});
