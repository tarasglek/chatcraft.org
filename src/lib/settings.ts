/**
 * Settings can be accessed multiple ways, either via the `useSettings()`
 * hook, or if outside React, using this module.  Both use the same
 * values in localStorage. The benefit of the `useSettings()` hook is that
 * it makes changes to the settings reactive.  This code module is useful
 * when you only need to read something.
 */
import { ChatCraftModel } from "../lib/ChatCraftModel";
import { ProviderData, ChatCraftProvider } from "../lib/ChatCraftProvider";
import { providerFromJSON, providerFromUrl } from "./providers";
import { FreeModelProvider } from "./providers/DefaultProvider/FreeModelProvider";
/**
 * We can use models from OpenAI or OpenRouter (https://openrouter.ai/docs).
 * If using the latter, we need to override the basePath to use the OpenRouter URL.
 */

type TextToSpeechSettings = {
  announceMessages?: boolean;
  voice: TextToSpeechVoices;
};

export enum TextToSpeechVoices {
  ALLOY = "alloy",
  ECHO = "echo",
  FABLE = "fable",
  ONYX = "onyx",
  NOVA = "nova",
  SHIMMER = "shimmer",
}

export type Settings = {
  model: ChatCraftModel;
  temperature: number;
  enterBehaviour: EnterBehaviour;
  countTokens: boolean;
  sidebarVisible: boolean;
  alwaysSendFunctionResult: boolean;
  customSystemPrompt?: string;
  textToSpeech: TextToSpeechSettings;
  providers: ProviderData;
  currentProvider: ChatCraftProvider;
  compressionFactor: number;
  maxCompressedFileSizeMB: number;
  maxImageDimension: number;
};

export const defaults: Settings = {
  model: new ChatCraftModel("undi95/toppy-m-7b:free"),
  temperature: 0,
  enterBehaviour: "send",
  // Disabled by default, since token parsing requires downloading larger deps
  countTokens: false,
  sidebarVisible: false,
  // Disabled by default, so we don't waste tokens
  alwaysSendFunctionResult: false,
  textToSpeech: {
    announceMessages: false,
    voice: TextToSpeechVoices.ALLOY,
  },
  providers: {},
  currentProvider: new FreeModelProvider(),
  compressionFactor: 1,
  maxCompressedFileSizeMB: 20,
  maxImageDimension: 2048,
};

export const key = "settings";

export const serializer = (value: Settings) => JSON.stringify(value);

export const deserializer = (value: string): Settings => {
  const settings = JSON.parse(value);
  if (!settings.model) {
    settings.model = defaults.model;
  }

  if (typeof settings.model === "string") {
    settings.model = new ChatCraftModel(settings.model);
  }

  if (settings.currentProvider) {
    // Handle deserialization of currentProvider
    settings.currentProvider = providerFromJSON(settings.currentProvider);
  } else {
    // No current provider, check if we need to handle migration of deprecated apiKey, apiUrl
    if (settings.apiKey && settings.apiUrl) {
      const newProvider = providerFromUrl(settings.apiUrl, settings.apiKey);
      settings.currentProvider = newProvider;
      settings.providers = { ...settings.providers, [newProvider.apiUrl]: newProvider };
      delete settings.apiKey;
      delete settings.apiUrl;
      console.warn("Migrated deprecated apiKey, apiUrl");
    }
  }

  return { ...defaults, ...settings };
};

export const getSettings = () => {
  const value = localStorage.getItem(key);
  if (value === null) {
    return defaults;
  }
  return deserializer(value);
};
