import { ChatCraftProvider, SerializedChatCraftProvider } from "../ChatCraftProvider";

export const COHERE_API_URL = "https://api.cohere.com/v2";
export const Cohere_NAME = "Cohere";
const COHERE_DEFAULT_MODEL = "command-r";

export type SerializedCohereProvider = {
  id: string;
  name: string;
  apiUrl: string;
  apiKey?: string;
  defaultModel: string;
};

export class CohereProvider extends ChatCraftProvider {
  constructor(key?: string, name?: string) {
    super(name || Cohere_NAME, COHERE_API_URL, COHERE_DEFAULT_MODEL, key);
  }

  get logoUrl() {
    return "/cohere-logo.png";
  }

  static fromJSON({ apiKey, name }: SerializedChatCraftProvider): CohereProvider {
    return new CohereProvider(apiKey, name);
  }

  async queryModels(key: string): Promise<string[]> {
    try {
      const url = new URL("./models", this.apiUrl);
      url.searchParams.append("page_size", "1000");

      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${key}`,
        },
      });

      if (!res.ok) {
        throw new Error("Error getting Cohere models");
      }

      const results = await res.json();

      const models: any[] = [];
      if ("models" in results && Array.isArray(results.models)) {
        results.models.forEach((model: any) => {
          // Only include chat models
          if (Array.isArray(model.endpoints) && model.endpoints.includes("chat")) {
            models.push(model);
          }
        });
      }

      const modelList = models.map((model: any) => model.name as string);
      return modelList.sort((a, b) => a.localeCompare(b));
    } catch (err: any) {
      throw new Error(`error querying models API: ${err.message}`);
    }
  }

  async validateApiKey(key: string) {
    return !!(await this.queryModels(key));
  }
}
