import { ChatCraftModel } from "../ChatCraftModel";
import {
  ChatCraftProvider,
  SerializedChatCraftProvider,
  OPENROUTER_API_URL,
  ProviderName,
} from "../ChatCraftProvider";
import { getReferer } from "../utils";

export type SerializedOpenRouterProvider = {
  id: string;
  name: ProviderName;
  apiUrl: string;
  apiKey?: string;
};

export class OpenRouterProvider extends ChatCraftProvider {
  constructor(key?: string) {
    super(OPENROUTER_API_URL, key);
  }

  get clientHeaders() {
    return {
      "HTTP-Referer": getReferer(),
      "X-Title": "chatcraft.org",
    };
  }

  // Parse from serialized JSON
  static fromJSON({ apiKey }: SerializedChatCraftProvider): OpenRouterProvider {
    return new OpenRouterProvider(apiKey);
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

  defaultModelForProvider() {
    return new ChatCraftModel("openai/gpt-3.5-turbo");
  }
}
