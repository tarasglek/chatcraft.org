import { ChatCraftModel } from "../ChatCraftModel";
import {
  ChatCraftProvider,
  SerializedChatCraftProvider,
  OPENAI_API_URL,
} from "../ChatCraftProvider";

export type SerializedOpenAiProvider = {
  id: string;
  name: string;
  apiUrl: string;
  apiKey?: string;
};

export class OpenAiProvider extends ChatCraftProvider {
  constructor(key?: string, name?: string) {
    super(name || "OpenAI", OPENAI_API_URL, key);
  }

  get logoUrl() {
    return "/openai-logo.png";
  }

  // Parse from serialized JSON
  static fromJSON({ apiKey, name }: SerializedChatCraftProvider): OpenAiProvider {
    return new OpenAiProvider(apiKey, name);
  }

  async validateApiKey(key: string) {
    return !!(await this.queryModels(key));
  }

  defaultModelForProvider() {
    return new ChatCraftModel("gpt-3.5-turbo");
  }
}
