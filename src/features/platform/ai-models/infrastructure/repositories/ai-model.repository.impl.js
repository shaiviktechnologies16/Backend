import { AIModelRepository } from "../../domain/repositories/ai-model.repository.js";

export class AIModelRepositoryImpl extends AIModelRepository {
  constructor(dataSource) {
    super();

    this.repository = dataSource.getRepository("AIModel");
  }

  async create(data) {
    const model = this.repository.create(data);

    return await this.repository.save(model);
  }

  async update(id, data) {
    await this.repository.update(id, data);

    return await this.findById(id);
  }

  async findAll() {
    return await this.repository.find({
      order: {
        createdAt: "DESC",
      },
    });
  }

  async findById(id) {
    return await this.repository.findOne({
      where: {
        id,
      },
    });
  }

  async updateStatus(id, status) {
    await this.repository.update(id, {
      status,
    });

    return await this.findById(id);
  }
}
