export class SynthesizeSpeechUseCase {
  constructor({ ttsProviderFactory }) {
    this.ttsProviderFactory = ttsProviderFactory;
  }

  async execute({ text, options = {} }) {
    const provider = await this.ttsProviderFactory.getProvider();

    return provider.synthesize(text, options);
  }
}
