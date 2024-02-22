import { nanoid } from "nanoid";

export type ProviderName = "OpenAI" | "OpenRouter.ai";

export const OPENAI_API_URL = "https://api.openai.com/v1";
export const OPENROUTER_API_URL = "https://openrouter.ai/api/v1";

const urlToNameMap: { [key: string]: ProviderName } = {
  [OPENAI_API_URL]: "OpenAI",
  [OPENROUTER_API_URL]: "OpenRouter.ai",
};

export interface ProviderData {
  [key: string]: ChatCraftProvider;
}

export type SerializedChatCraftProvider = {
  id: string;
  name: ProviderName;
  apiUrl: string;
  apiKey?: string;
};

export abstract class ChatCraftProvider {
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
}
