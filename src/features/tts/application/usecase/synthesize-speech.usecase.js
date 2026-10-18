export class SynthesizeSpeechUseCase {
  constructor({ ttsProviderFactory }) {
    this.ttsProviderFactory = ttsProviderFactory;
  }

  async execute({ text, options = {} }) {
    let provider = null;
    if (options.provider) {
      provider = this.ttsProviderFactory.getProviderByName(options.provider);
    }
    if (!provider) {
      provider = await this.ttsProviderFactory.getProvider();
    }

    return provider.synthesize(text, options);
  }
}
