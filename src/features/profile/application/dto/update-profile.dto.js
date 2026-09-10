export class UpdateProfileDto {
  constructor({ name = undefined, phone = undefined }) {
    this.name = name;
    this.phone = phone;
  }
}
