import { nanoid } from "nanoid";
import OpenAI from "openai";
import { ChatCraftModel } from "./ChatCraftModel";

export const OPENAI_API_URL = "https://api.openai.com/v1";
export const OPENROUTER_API_URL = "https://openrouter.ai/api/v1";
export const FREEMODELPROVIDER_API_URL = "https://free-chatcraft-ai.deno.dev/api/v1";

export const OPENAI_NAME = "OpenAI";
export const OPENROUTER_NAME = "OpenRouter.ai";
export const FREEMODELPROVIDER_NAME = "Free AI Models";

export const nameToUrlMap: { [key: string]: string } = {
  [OPENAI_NAME]: OPENAI_API_URL,
  [OPENROUTER_NAME]: OPENROUTER_API_URL,
  [FREEMODELPROVIDER_NAME]: FREEMODELPROVIDER_API_URL,
};

export interface ProviderData {
  [key: string]: ChatCraftProvider;
}

export type SerializedChatCraftProvider = {
  id: string;
  name: string;
  apiUrl: string;
  apiKey?: string;
  defaultModel: string;
};

export abstract class ChatCraftProvider {
  id: string;
  name: string;
  apiUrl: string;
  apiKey?: string;
  defaultModel: string;

  constructor(name: string, url: string, defaultModel: string, key?: string) {
    this.id = nanoid();
    this.name = name;
    this.apiUrl = url;
    this.apiKey = key;
    this.defaultModel = defaultModel;
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

  defaultModelForProvider(): ChatCraftModel {
    return new ChatCraftModel(this.defaultModel);
  }
}
