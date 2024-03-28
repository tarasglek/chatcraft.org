import { nanoid } from "nanoid";
import OpenAI from "openai";
import { ChatCraftModel } from "./ChatCraftModel";

export type ProviderName = "OpenAI" | "OpenRouter.ai" | "Free AI Models";

export const OPENAI_API_URL = "https://api.openai.com/v1";
export const OPENROUTER_API_URL = "https://openrouter.ai/api/v1";
export const FREEMODELPROVIDER_API_URL = "https://free-chatcraft-ai.deno.dev/api/v1";

export const nameToUrlMap: { [key: string]: string } = {
  ["OpenAI"]: OPENAI_API_URL,
  ["OpenRouter.ai"]: OPENROUTER_API_URL,
  ["Free AI Models"]: FREEMODELPROVIDER_API_URL,
};

const urlToNameMap: { [key: string]: ProviderName } = {
  [OPENAI_API_URL]: "OpenAI",
  [OPENROUTER_API_URL]: "OpenRouter.ai",
  [FREEMODELPROVIDER_API_URL]: "Free AI Models",
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

  createClient(key: string) {
    return {
      openai: new OpenAI({
        apiKey: key,
        baseURL: this.apiUrl,
        defaultHeaders: this.clientHeaders,
        dangerouslyAllowBrowser: true,
      }),
      headers: this.clientHeaders,
    };
  }

  get clientHeaders() {
    return {};
  }

  get logoUrl() {
    // If we don't know, use the OpenAI logo as a fallback
    return "/openai-logo.png";
  }

  async queryModels(key: string) {
    if (!this.apiUrl) {
      throw new Error("Missing API Url");
    }

    const { openai } = this.createClient(key);

    try {
      const models = [];
      for await (const page of openai.models.list()) {
        models.push(page);
      }

      return models.map((model: any) => model.id) as string[];
    } catch (err: any) {
      throw new Error(`error querying models API: ${err.message}`);
    }
  }

  abstract validateApiKey(key: string): Promise<boolean>;

  abstract defaultModelForProvider(): ChatCraftModel;
}
