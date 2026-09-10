import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

@Entity("organization_invitations")
export class OrganizationInvitationOrmEntity {
  @PrimaryGeneratedColumn("uuid")
  id;

  @Index()
  @Column({
    name: "organization_id",
    type: "uuid",
  })
  organizationId;

  @Index()
  @Column({
    type: "varchar",
    length: 255,
  })
  email;

  @Column({
    type: "varchar",
    length: 50,
  })
  role;

  @Index({ unique: true })
  @Column({
    type: "varchar",
    length: 255,
  })
  token;

  @Column({
    type: "varchar",
    length: 30,
    default: "PENDING",
  })
  status;

  @Column({
    name: "expires_at",
    type: "timestamp",
  })
  expiresAt;

  @Column({
    name: "accepted_at",
    type: "timestamp",
    nullable: true,
  })
  acceptedAt;

  @Column({
    name: "created_by",
    type: "uuid",
  })
  createdBy;

  @CreateDateColumn({
    name: "created_at",
  })
  createdAt;

  @UpdateDateColumn({
    name: "updated_at",
  })
  updatedAt;
}
