import { ChatCraftProvider, ProviderData, SerializedChatCraftProvider } from "../ChatCraftProvider";
import { getSettings } from "../settings";
import { OPENAI_API_URL, OpenAiProvider } from "./OpenAiProvider";
import { OPENROUTER_API_URL, OpenRouterProvider } from "./OpenRouterProvider";
import { FREEMODELPROVIDER_API_URL, FreeModelProvider } from "./DefaultProvider/FreeModelProvider";
import { CustomProvider } from "./CustomProvider";

export const usingOfficialOpenAI = () => getSettings().currentProvider.apiUrl === OPENAI_API_URL;
export const usingOfficialOpenRouter = () =>
  getSettings().currentProvider.apiUrl === OPENROUTER_API_URL;

// Parses url into instance of ChatCraftProvider
export function providerFromUrl(url: string, key?: string, name?: string, defaultModel?: string) {
  // trim trailing / from url
  const trimmedUrl = url.trim().replace(/\/+$/, "");

  if (trimmedUrl === OPENAI_API_URL) {
    return new OpenAiProvider(key, name);
  }

  if (trimmedUrl === OPENROUTER_API_URL) {
    return new OpenRouterProvider(key, name);
  }

  if (trimmedUrl === FREEMODELPROVIDER_API_URL) {
    return new FreeModelProvider();
  }

  if (name) {
    return new CustomProvider(name, url, defaultModel || "", key);
  }

  throw new Error("Error parsing provider from url, name missing");
}

// Parse JSON into instance of ChatCraftProvider
export function providerFromJSON({
  id,
  name,
  apiUrl,
  apiKey,
  defaultModel,
}: SerializedChatCraftProvider): ChatCraftProvider {
  if (apiUrl === OPENAI_API_URL) {
    return OpenAiProvider.fromJSON({ id, name, apiUrl, apiKey, defaultModel });
  }

  if (apiUrl === OPENROUTER_API_URL) {
    return OpenRouterProvider.fromJSON({
      id,
      name,
      apiUrl,
      apiKey,
      defaultModel,
    });
  }

  // needed?
  // if (apiUrl === FREEMODELPROVIDER_API_URL) {
  //   return new FreeModelProvider();
  // }

  return CustomProvider.fromJSON({ id, name, apiUrl, apiKey, defaultModel });
}

export const supportedProviders: ProviderData = (() => {
  const freeModel = new FreeModelProvider();
  const openRouter = new OpenRouterProvider();
  const openAi = new OpenAiProvider();

  return {
    [freeModel.name]: freeModel,
    [openRouter.name]: openRouter,
    [openAi.name]: openAi,
  };
})();
