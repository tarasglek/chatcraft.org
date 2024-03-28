import {
  ChatCraftProvider,
  OPENAI_API_URL,
  OPENROUTER_API_URL,
  FREEMODELPROVIDER_API_URL,
  ProviderData,
  SerializedChatCraftProvider,
} from "../ChatCraftProvider";
import { getSettings } from "../settings";
import { OpenAiProvider } from "./OpenAiProvider";
import { OpenRouterProvider } from "./OpenRouterProvider";
import { FreeModelProvider } from "./DefaultProvider/FreeModelProvider";
import { CustomProvider } from "./CustomProvider";

export const usingOfficialOpenAI = () => getSettings().currentProvider.apiUrl === OPENAI_API_URL;
export const usingOfficialOpenRouter = () =>
  getSettings().currentProvider.apiUrl === OPENROUTER_API_URL;

// Parses url into instance of ChatCraftProvider
export function providerFromUrl(url: string, name: string, key?: string) {
  if (url === OPENAI_API_URL) {
    return new OpenAiProvider(key, name);
  }

  if (url === OPENROUTER_API_URL) {
    return new OpenRouterProvider(key, name);
  }

  if (url === FREEMODELPROVIDER_API_URL) {
    return new FreeModelProvider();
  }

  return new CustomProvider(name, url, key);
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

  if (apiUrl === FREEMODELPROVIDER_API_URL) {
    return new FreeModelProvider();
  }

  return CustomProvider.fromJSON({ id, name, apiUrl, apiKey });
}

// Returns list of supported providers
export const getSupportedProviders = (): ProviderData => {
  const openAi = new OpenAiProvider();
  const openRouter = new OpenRouterProvider();
  const freeModel = new FreeModelProvider();

  return {
    [freeModel.name]: freeModel,
    [openRouter.name]: openRouter,
    [openAi.name]: openAi,
  };
};
