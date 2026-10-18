import { IndicF5Provider } from "./indicf5/indicf5.provider.js";
import { FishAudioProvider } from "./fish-audio/fish-audio.provider.js";

export function createTTSProviderFactory({ getPlatformConfigUseCase }) {
  const indicf5 = new IndicF5Provider({
    getPlatformConfigUseCase,
  });

  const fishAudio = new FishAudioProvider({
    getPlatformConfigUseCase,
  });

  const providers = {
    indicf5,
    fish_audio: fishAudio,
    "fish-audio": fishAudio,
  };

  return {
    async getProvider() {
      const rawName = await getPlatformConfigUseCase.getValue("TTS_PROVIDER");
      const providerName = (rawName || "").trim().toLowerCase();
      const normalizedKey = providerName.replace("-", "_");

      const provider = providers[normalizedKey] || providers[providerName];

      if (!provider) {
        throw new Error(`Unsupported TTS provider: ${rawName || providerName}`);
      }

      return provider;
    },

    getProviderByName(name) {
      if (!name) return null;
      const normalized = name.trim().toLowerCase().replace("-", "_");
      return providers[normalized] || providers[name] || null;
    },
  };
}
