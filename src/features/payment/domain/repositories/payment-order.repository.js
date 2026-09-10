export class PaymentOrderRepository {
  async create(paymentOrder) {
    throw new Error("Method not implemented.");
  }

  async findById(id) {
    throw new Error("Method not implemented.");
  }

  async findByRazorpayOrderId(razorpayOrderId) {
    throw new Error("Method not implemented.");
  }

  async updateStatus(id, status, details = {}) {
    throw new Error("Method not implemented.");
  }
}
