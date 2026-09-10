import bcrypt from "bcrypt";

export class PasswordService {
  async hash(password) {
    return bcrypt.hash(password, 10);
  }

  async compare(password, passwordHash) {
    return bcrypt.compare(password, passwordHash);
  }
}
