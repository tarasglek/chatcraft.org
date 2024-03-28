import { ChatCraftModel } from "../ChatCraftModel";
import { ChatCraftProvider, SerializedChatCraftProvider } from "../ChatCraftProvider";

export type SerializedCustomProvider = {
  id: string;
  name: string;
  apiUrl: string;
  apiKey?: string;
};

export class CustomProvider extends ChatCraftProvider {
  constructor(name: string, url: string, key?: string) {
    super(name, url, key);
  }

  get logoUrl() {
    return "/openai-logo.png";
  }

  // Parse from serialized JSON
  static fromJSON({ name, apiUrl, apiKey }: SerializedChatCraftProvider): CustomProvider {
    return new CustomProvider(name, apiUrl, apiKey);
  }

  async validateApiKey(key: string) {
    return !!(await this.queryModels(key));
  }

  defaultModelForProvider() {
    return new ChatCraftModel("gpt-3.5-turbo");
  }
}
