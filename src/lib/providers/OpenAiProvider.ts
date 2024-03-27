import {
  ChatCraftProvider,
  SerializedChatCraftProvider,
  OPENAI_API_URL,
  OPENAI_NAME,
} from "../ChatCraftProvider";

const OPENAI_DEFAULT_MODEL = "gpt-3.5-turbo";

export type SerializedOpenAiProvider = {
  id: string;
  name: string;
  apiUrl: string;
  apiKey?: string;
  defaultModel: string;
};

export class OpenAiProvider extends ChatCraftProvider {
  constructor(key?: string, name?: string) {
    super(name || OPENAI_NAME, OPENAI_API_URL, OPENAI_DEFAULT_MODEL, key);
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
}
