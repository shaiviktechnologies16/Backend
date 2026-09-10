export class AIProvider {
  get name() {
    throw new Error("Method not implemented.");
  }

  get model() {
    throw new Error("Method not implemented.");
  }

  get maxContextMessages() {
    return 30;
  }

  async chat(messages, options = {}) {
    throw new Error("Method not implemented.");
  }

  async *stream(messages, options = {}) {
    throw new Error("Method not implemented.");
  }

  async health() {
    throw new Error("Method not implemented.");
  }
}
