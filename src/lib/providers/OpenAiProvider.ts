import { queryModels } from "../ai";
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

  // Parse from serialized JSON
  static fromJSON({ apiKey }: SerializedChatCraftProvider): OpenAiProvider {
    return new OpenAiProvider(apiKey);
  }

  static async validateApiKey(apiKey: string) {
    return !!(await queryModels(apiKey));
  }

  static logoUrl() {
    return "/openai-logo.png";
  }

  static defaultModel() {
    return "gpt-3.5-turbo";
  }
}
