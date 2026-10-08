export class ModelCostCalculatorService {
  constructor() {
    this.rates = {
      "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.6 },
      "gpt-4o": { inputPer1M: 2.5, outputPer1M: 10.0 },
      "gpt-4": { inputPer1M: 30.0, outputPer1M: 60.0 },
      "gpt-3.5-turbo": { inputPer1M: 0.5, outputPer1M: 1.5 },
      "claude-3-5-sonnet": { inputPer1M: 3.0, outputPer1M: 15.0 },
    };
  }

  calculateCost({ modelName, inputTokens = 0, outputTokens = 0 }) {
    if (!modelName) return 0;

    const normalizedModel = String(modelName).toLowerCase().trim();
    const rate = this.rates[normalizedModel];

    if (!rate) {
      return 0; // Local / Ollama free compute default
    }

    const inputCost = (inputTokens / 1_000_000) * rate.inputPer1M;
    const outputCost = (outputTokens / 1_000_000) * rate.outputPer1M;
    const totalCost = inputCost + outputCost;

    return Number(totalCost.toFixed(6));
  }
}
