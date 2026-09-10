export class AdminLoginDto {
  constructor({ email, password }) {
    this.email = email?.trim().toLowerCase();
    this.password = password;
  }

  validate() {
    if (!this.email) {
      throw new Error("Email is required.");
    }

    if (!this.password) {
      throw new Error("Password is required.");
    }
  }
}
