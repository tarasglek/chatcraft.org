import { ChatCraftModel } from "../ChatCraftModel";
import {
  ChatCraftProvider,
  SerializedChatCraftProvider,
  OPENAI_API_URL,
  ProviderName,
} from "../ChatCraftProvider";

export type SerializedOpenAiProvider = {
  id: string;
  name: ProviderName;
  apiUrl: string;
  apiKey?: string;
};

export class OpenAiProvider extends ChatCraftProvider {
  constructor(key?: string) {
    super(OPENAI_API_URL, key);
  }

  get logoUrl() {
    return "/openai-logo.png";
  }

  // Parse from serialized JSON
  static fromJSON({ apiKey }: SerializedChatCraftProvider): OpenAiProvider {
    return new OpenAiProvider(apiKey);
  }

  async validateApiKey(key: string) {
    return !!(await this.queryModels(key));
  }

  defaultModelForProvider() {
    return new ChatCraftModel("gpt-3.5-turbo");
  }
}
