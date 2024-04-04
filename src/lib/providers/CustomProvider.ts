import { ChatCraftProvider, SerializedChatCraftProvider } from "../ChatCraftProvider";

export type SerializedCustomProvider = {
  id: string;
  name: string;
  apiUrl: string;
  apiKey?: string;
  defaultModel: string;
};

export class CustomProvider extends ChatCraftProvider {
  constructor(name: string, url: string, defaultModel: string, key?: string) {
    super(name, url, defaultModel, key);
  }

  get logoUrl() {
    return "/openai-logo.png";
  }

  // Parse from serialized JSON
  static fromJSON({
    name,
    apiUrl,
    defaultModel,
    apiKey,
  }: SerializedChatCraftProvider): CustomProvider {
    return new CustomProvider(name, apiUrl, defaultModel, apiKey);
  }

  async validateApiKey(key: string) {
    return !!(await this.queryModels(key));
  }
}
