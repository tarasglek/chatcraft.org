import { nanoid } from "nanoid";

type ProviderName = "OpenAI" | "OpenRouter.ai";

export const OPENAI_API_URL = "https://api.openai.com/v1";
export const OPENROUTER_API_URL = "https://openrouter.ai/api/v1";

const urlToNameMap: { [key: string]: ProviderName } = {
  [OPENAI_API_URL]: "OpenAI",
  [OPENROUTER_API_URL]: "OpenRouter.ai",
};

export type SerializedChatCraftProvider = {
  id: string;
  name: ProviderName;
  apiUrl: string;
  apiKey?: string;
};

export class ChatCraftProvider {
  id: string;
  name: ProviderName;
  apiUrl: string;
  apiKey?: string;

  constructor(url: string, key?: string) {
    this.id = nanoid();
    this.name = urlToNameMap[url];
    this.apiUrl = url;
    this.apiKey = key;
  }

  // Parses url into instance of ChatCraftProvider
  static fromUrl(url: string, key?: string) {
    return new ChatCraftProvider(url, key);
  }

  // Parse from serialized JSON
  static fromJSON({ id, name, apiUrl, apiKey }: SerializedChatCraftProvider): ChatCraftProvider {
    const provider = new ChatCraftProvider(apiUrl, apiKey);
    provider.id = id;
    provider.name = name;
    return provider;
  }
}
