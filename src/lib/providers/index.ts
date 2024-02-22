import {
  ChatCraftProvider,
  OPENAI_API_URL,
  OPENROUTER_API_URL,
  ProviderData,
  SerializedChatCraftProvider,
} from "../ChatCraftProvider";
import { OpenAiProvider } from "./OpenAiProvider";
import { OpenRouterProvider } from "./OpenRouterProvider";

// Parses url into instance of ChatCraftProvider
export function providerFromUrl(url: string, key?: string) {
  if (url === OPENAI_API_URL) {
    return new OpenAiProvider(key);
  }

  if (url === OPENROUTER_API_URL) {
    return new OpenRouterProvider(key);
  }

  throw new Error(`Error parsing provider from url, unsupported url: ${url}`);
}

// Parse JSON into instance of ChatCraftProvider
export function providerFromJSON({
  id,
  name,
  apiUrl,
  apiKey,
}: SerializedChatCraftProvider): ChatCraftProvider {
  if (apiUrl === OPENAI_API_URL) {
    return OpenAiProvider.fromJSON({ id, name, apiUrl, apiKey });
  }

  if (apiUrl === OPENROUTER_API_URL) {
    return OpenRouterProvider.fromJSON({ id, name, apiUrl, apiKey });
  }

  throw new Error(`Error parsing provider from JSON, unsupported url: ${apiUrl}`);
}

// Returns list of supported providers
export const getSupportedProviders = (): ProviderData => {
  const openAi = new OpenAiProvider();
  const openRouter = new OpenRouterProvider();

  return {
    [openAi.apiUrl]: openAi,
    [openRouter.apiUrl]: openRouter,
  };
};
