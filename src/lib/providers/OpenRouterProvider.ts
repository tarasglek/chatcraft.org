import {
  ChatCraftProvider,
  SerializedChatCraftProvider,
  OPENROUTER_API_URL,
  ProviderName,
} from "../ChatCraftProvider";

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

  // Parse from serialized JSON
  static fromJSON({ apiKey }: SerializedChatCraftProvider): OpenRouterProvider {
    return new OpenRouterProvider(apiKey);
  }

  static async validateApiKey(apiKey: string) {
    // Use response from https://openrouter.ai/docs#limits to check if API key is valid
    const res = await fetch(`https://openrouter.ai/api/v1/auth/key`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      throw new Error(`${res.status} ${await res.text()}`);
    }

    return true;
  }

  static openRouterPkceRedirect = () => {
    const callbackUrl = location.origin;
    // Redirect the user to the OpenRouter authentication page in the same tab
    location.href = `https://openrouter.ai/auth?callback_url=${encodeURIComponent(callbackUrl)}`;
  };

  static logoUrl() {
    // If we don't know, use the OpenAI logo as a fallback
    return "/openai-logo.png";
  }

  static defaultModel() {
    return "openai/gpt-3.5-turbo";
  }
}
