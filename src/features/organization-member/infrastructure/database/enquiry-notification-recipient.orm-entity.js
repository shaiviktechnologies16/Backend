import { EntitySchema } from "typeorm";

export const EnquiryNotificationRecipientOrmEntity = new EntitySchema({
  name: "EnquiryNotificationRecipient",
  tableName: "organization_enquiry_notification_recipients",

  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },

    organizationId: {
      name: "organization_id",
      type: "uuid",
      nullable: false,
    },

    organizationMemberId: {
      name: "organization_member_id",
      type: "uuid",
      nullable: true,
    },

    recipientPhoneNumber: {
      name: "recipient_phone_number",
      type: "varchar",
      length: 50,
      nullable: true,
    },

    channel: {
      type: "varchar",
      length: 30,
      default: "'WHATSAPP'",
    },

    enabled: {
      type: "boolean",
      default: true,
    },

    createdAt: {
      name: "created_at",
      type: "timestamp",
      default: () => "CURRENT_TIMESTAMP",
    },

    updatedAt: {
      name: "updated_at",
      type: "timestamp",
      default: () => "CURRENT_TIMESTAMP",
    },
  },

  relations: {
    organizationMember: {
      type: "many-to-one",
      target: "OrganizationMember",
      joinColumn: {
        name: "organization_member_id",
        referencedColumnName: "id",
      },
      onDelete: "SET NULL",
      eager: false,
    },
  },
});
