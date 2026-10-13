import OpenAI from "openai";
import { AIProvider } from "../interfaces/ai.provider.js";
import { ProviderError } from "../../common/errors/ProviderError.js";

export class OpenAIProvider extends AIProvider {
  constructor({ getPlatformApiKeyValueUseCase }) {
    super();

    this.getPlatformApiKeyValueUseCase = getPlatformApiKeyValueUseCase;
  }

  get name() {
    return "openai";
  }

  get model() {
    return "gpt-4o-mini";
  }

  get maxContextMessages() {
    return 30;
  }

  async getClient() {
    const apiKey = await this.getPlatformApiKeyValueUseCase.execute("openai");

    return new OpenAI({
      apiKey,
    });
  }

  async chat(messages, options = {}) {
    try {
      const client = await this.getClient();

      const response = await client.chat.completions.create({
        model: options.model || this.model,
        messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
      });

      return response;
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }

      throw new ProviderError("Unable to generate OpenAI response.", {
        cause: error,
      });
    }
  }

  async *stream(messages, options = {}) {
    try {
      const client = await this.getClient();

      const stream = await client.chat.completions.create({
        model: options.model || this.model,
        messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        stream: true,
        stream_options: {
          include_usage: true,
        },
      });

      for await (const chunk of stream) {
        const content = chunk.choices?.[0]?.delta?.content;

        if (content) {
          yield {
            type: "token",
            content,
          };
        }

        if (chunk.usage) {
          const inputTokens = chunk.usage.prompt_tokens ?? 0;
          const outputTokens = chunk.usage.completion_tokens ?? 0;

          yield {
            type: "usage",
            usage: {
              inputTokens,
              outputTokens,
              totalTokens:
                chunk.usage.total_tokens ??
                inputTokens + outputTokens,
            },
          };
        }
      }
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }

      throw new ProviderError("Unable to stream from OpenAI.", {
        cause: error,
      });
    }
  }
}
