import { IndicF5Provider } from "./indicf5/indicf5.provider.js";

export function createTTSProviderFactory({ getPlatformConfigUseCase }) {
  const providers = {
    indicf5: new IndicF5Provider({
      getPlatformConfigUseCase,
    }),
  };

  return {
    async getProvider() {
      const providerName =
        await getPlatformConfigUseCase.getValue("TTS_PROVIDER");

      const provider = providers[providerName];

      if (!provider) {
        throw new Error(`Unsupported TTS provider: ${providerName}`);
      }

      return provider;
    },

    getProviderByName(name) {
      return providers[name] ?? null;
    },
  };
}
