export class InviteMemberDto {
  constructor({ email, role }) {
    this.email = email?.trim().toLowerCase();
    this.role = role;
  }
}
