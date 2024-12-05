import { ChatCraftProvider } from "./ChatCraftProvider";
import { getSettings } from "./settings";
import { isSpeechToTextModel } from "./ai";

export class ModelService {
  static async getSpeechToTextClient() {
    const settings = getSettings();
    const provider = settings.currentProvider;

    if (!provider.apiKey) {
      return null;
    }

    return provider.createClient(provider.apiKey).openai;
  }

  static async getSpeechToTextModel(provider: ChatCraftProvider): Promise<string | null> {
    if (!provider.apiKey) {
      return null;
    }
    const models: string[] = await provider.queryModels(provider.apiKey);
    const sttModel = models.find((model) => isSpeechToTextModel(model));
    return sttModel || null;
  }

  static async isSpeechToTextSupported(provider: ChatCraftProvider): Promise<boolean> {
    if (!provider.apiKey) {
      return false;
    }
    const models: string[] = await provider.queryModels(provider.apiKey);
    return models.some((model) => isSpeechToTextModel(model));
  }
}
