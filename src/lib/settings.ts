/**
 * Settings can be accessed multiple ways, either via the `useSettings()`
 * hook, or if outside React, using this module.  Both use the same
 * values in localStorage. The benefit of the `useSettings()` hook is that
 * it makes changes to the settings reactive.  This code module is useful
 * when you only need to read something.
 */
import { ChatCraftModel } from "../lib/ChatCraftModel";

/**
 * We can use models from OpenAI or OpenRouter (https://openrouter.ai/docs).
 * If using the latter, we need to override the basePath to use the OpenRouter URL.
 */
export const OPENAI_API_URL = "https://api.openai.com/v1";
export const OPENROUTER_API_URL = "https://openrouter.ai/api/v1";

export type Settings = {
  apiKey?: string;
  model: ChatCraftModel;
  apiUrl: string;
  enterBehaviour: EnterBehaviour;
  justShowMeTheCode: boolean;
  countTokens: boolean;
  sidebarVisible: boolean;
};

export const defaults: Settings = {
  model: new ChatCraftModel("gpt-3.5-turbo", "OpenAI"),
  apiUrl: OPENAI_API_URL,
  enterBehaviour: "send",
  // Disabled by default, since token parsing requires downloading larger deps
  countTokens: false,
  justShowMeTheCode: false,
  sidebarVisible: false,
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

  return { ...defaults, ...settings };
};

export const getSettings = () => {
  const value = localStorage.getItem(key);
  if (value === null) {
    return defaults;
  }
  return deserializer(value);
};
