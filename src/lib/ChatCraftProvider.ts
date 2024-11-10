import { nanoid } from "nanoid";
import OpenAI from "openai";
import { ChatCraftModel } from "./ChatCraftModel";

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

      const modelList = models.map((model: any) => model.id as string);
      return modelList.sort((a, b) => a.localeCompare(b));
    } catch (err: any) {
      throw new Error(`error querying models API: ${err.message}`);
    }
  }

  abstract validateApiKey(key: string): Promise<boolean>;

  defaultModelForProvider(): ChatCraftModel {
    return new ChatCraftModel(this.defaultModel);
  }

  static areSameProviders(p1: ChatCraftProvider, p2: ChatCraftProvider) {
    return p1.apiUrl === p2.apiUrl && p1.apiKey === p2.apiKey;
  }
}

export type ChatCraftProviderWithModels = ChatCraftProvider & {
  models: ChatCraftModel[];
};
