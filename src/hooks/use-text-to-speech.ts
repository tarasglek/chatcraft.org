import { useCallback, useMemo } from "react";
import { TextToSpeechVoices } from "../lib/settings";
import { useModels } from "./use-models";
import { useSettings } from "./use-settings";
import { isTextToSpeechModel } from "../lib/ai";
import { ChatCraftModel } from "../lib/ChatCraftModel";
import OpenAI from "openai";
import { ChatCraftProvider } from "../lib/ChatCraftProvider";

type TextToSpeechModel = "tts-1" | "tts-1-hd";

export const useTextToSpeech = () => {
  const { allProvidersWithModels } = useModels();

  const { settings } = useSettings();

  const isTextToSpeechSupported = useMemo(() => {
    return allProvidersWithModels
      .map((p) => p.models)
      .flat()
      .some((model) => isTextToSpeechModel(model.name));
  }, [allProvidersWithModels]);

  const getTextToSpeechClient = useCallback(
    (preferredModel?: string) => {
      let supported = false;
      const acceptableModel = (model: ChatCraftModel) =>
        preferredModel ? model.name === preferredModel : isTextToSpeechModel(model.name);

      // Check if the current provider supports TTS
      const currentProvider = allProvidersWithModels.find((provider) =>
        ChatCraftProvider.areSameProviders(provider, settings.currentProvider)
      );
      if (currentProvider) {
        supported = currentProvider.models.some(acceptableModel);

        if (supported && currentProvider.apiKey) {
          return new OpenAI({
            apiKey: currentProvider.apiKey,
            baseURL: currentProvider.apiUrl,
            dangerouslyAllowBrowser: true,
          });
        }
      }

      // Check rest of the providers
      const otherProviders = allProvidersWithModels.filter((p) => p.id !== currentProvider?.id);
      for (const provider of otherProviders) {
        supported = provider.models.some(acceptableModel);

        if (supported && provider.apiKey) {
          return new OpenAI({
            apiKey: provider.apiKey,
            baseURL: provider.apiUrl,
            dangerouslyAllowBrowser: true,
          });
        }
      }

      return null;
    },
    [allProvidersWithModels, settings.currentProvider]
  );

  /**
   *
   * @param message The text for which speech needs to be generated
   * @returns A Promise that resolves to the URL of generated audio clip
   */
  const textToSpeech = async (
    message: string,
    voice: TextToSpeechVoices = TextToSpeechVoices.ALLOY,
    model: TextToSpeechModel = "tts-1"
  ): Promise<string> => {
    const openai = await getTextToSpeechClient(model);

    if (!openai) {
      throw new Error("No configured provider supports text to speech.");
    }

    const response = await openai.audio.speech.create({
      model,
      voice,
      input: message,
    });

    const audioUrl = URL.createObjectURL(await response.blob());

    return audioUrl;
  };

  return {
    isTextToSpeechSupported,
    textToSpeech,
  };
};
