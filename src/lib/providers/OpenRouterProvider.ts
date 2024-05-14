import { ChatCraftProvider, SerializedChatCraftProvider } from "../ChatCraftProvider";
import { getReferer } from "../utils";

export const OPENROUTER_API_URL = "https://openrouter.ai/api/v1";
export const OPENROUTER_NAME = "OpenRouter.ai";
const OPENROUTER_DEFAULT_MODEL = "openrouter/auto";

export type SerializedOpenRouterProvider = {
  id: string;
  name: string;
  apiUrl: string;
  apiKey?: string;
  defaultModel: string;
};

export class OpenRouterProvider extends ChatCraftProvider {
  constructor(key?: string, name?: string) {
    super(name || OPENROUTER_NAME, OPENROUTER_API_URL, OPENROUTER_DEFAULT_MODEL, key);
  }

  get clientHeaders() {
    return {
      "HTTP-Referer": getReferer(),
      "X-Title": "chatcraft.org",
    };
  }

  // Parse from serialized JSON
  static fromJSON({ apiKey, name }: SerializedChatCraftProvider): OpenRouterProvider {
    return new OpenRouterProvider(apiKey, name);
  }

  async validateApiKey(key: string) {
    // Use response from https://openrouter.ai/docs#limits to check if API key is valid
    const res = await fetch(`${OPENROUTER_API_URL}/auth/key`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`,
      },
    });

    if (!res.ok) {
      throw new Error(`${res.status} ${await res.text()}`);
    }

    return true;
  }

  openRouterPkceRedirect = () => {
    const callbackUrl = location.origin;
    // Redirect the user to the OpenRouter authentication page in the same tab
    location.href = `https://openrouter.ai/auth?callback_url=${encodeURIComponent(callbackUrl)}`;
  };
}
