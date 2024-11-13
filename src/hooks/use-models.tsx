import {
  useState,
  useEffect,
  createContext,
  useContext,
  useRef,
  type ReactNode,
  type FC,
  useMemo,
  useCallback,
} from "react";
import { ChatCraftModel } from "../lib/ChatCraftModel";
import { getSettings } from "../lib/settings";
import { useSettings } from "./use-settings";
import { isSpeechToTextModel } from "../lib/ai";
import { ChatCraftProvider, ChatCraftProviderWithModels } from "../lib/ChatCraftProvider";
import OpenAI from "openai";
import { supportedProviders } from "../lib/providers";

const defaultModels = [getSettings().currentProvider.defaultModelForProvider()];

type ModelsContextType = {
  models: ChatCraftModel[];
  allAvailableModels: ChatCraftModel[];
  allProvidersWithModels: ChatCraftProviderWithModels[];
  error: Error | null;
  isSpeechToTextSupported: boolean;
  getSpeechToTextClient: (preferredModel?: string) => OpenAI | null;
};

const ModelsContext = createContext<ModelsContextType>({
  models: defaultModels,
  allAvailableModels: [],
  allProvidersWithModels: [],
  error: null,
  isSpeechToTextSupported: false,
  getSpeechToTextClient: () => null,
});

export const useModels = () => useContext(ModelsContext);

// Make sure that the default model we are using works with this provider's models
const pickDefaultModel = (currentModel: ChatCraftModel, models: ChatCraftModel[] | null) => {
  if (!models) {
    return currentModel;
  }

  if (models.find((model) => currentModel.id === model.id)) {
    return currentModel;
  }

  return getSettings().currentProvider.defaultModelForProvider();
};

export const ModelsProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [models, setModels] = useState<ChatCraftModel[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const isFetchingModels = useRef(false);
  const { settings, setSettings } = useSettings();

  // This is a list of all the models, based on configured providers
  const [allProvidersWithModels, setAllProvidersWithModels] = useState<
    ChatCraftProviderWithModels[]
  >([]);
  const isFetchingAllProvidersWithModels = useRef(false);

  useEffect(() => {
    const defaultSupportedProviders = Object.values(supportedProviders);
    const settingsProviders = Object.values(settings.providers);

    // Merge default and settings providers
    const availableProviders = [
      ...defaultSupportedProviders.filter(
        // Make sure we do not repeat providers that are in settings too
        (provider) =>
          !settingsProviders.some((p) => ChatCraftProvider.areSameProviders(p, provider))
      ),
      ...settingsProviders,
    ];

    if (isFetchingAllProvidersWithModels.current) {
      return; // Return early if we're already fetching
    }

    const fetchModelsForAllProviders = async () => {
      isFetchingAllProvidersWithModels.current = true;
      try {
        // Fetch models for all providers concurrently
        const fetchPromises = availableProviders.map((provider) => {
          // Skip providers without an apiKey
          if (!provider.apiKey) return Promise.resolve([]);

          return provider
            .queryModels(provider.apiKey)
            .then((models) => {
              return {
                ...provider,
                models: models.map((modelName) => new ChatCraftModel(modelName)),
              } as ChatCraftProviderWithModels;
            })
            .catch((error: any) => {
              console.warn(`Couldn't fetch models from provider "${provider.name}"`, error);
            });
        });

        // Wait for all promises to resolve
        const allModelsData = (await Promise.all(fetchPromises))
          // Some results might be `undefined` if provider's endpoint fails
          .filter((data) => !!data);

        // Flatten the models and update the state
        setAllProvidersWithModels(allModelsData.flat());
      } catch (err) {
        console.warn("Unable to update models for all providers, using defaults.", err);
        setAllProvidersWithModels([]); // Reset or set default models here
        setError(err as Error);
      } finally {
        isFetchingAllProvidersWithModels.current = false;
      }
    };

    fetchModelsForAllProviders();
  }, [settings.providers]);

  const allAvailableModels = useMemo(() => {
    return allProvidersWithModels.map((provider) => provider.models).flat();
  }, [allProvidersWithModels]);

  const isSpeechToTextSupported = useMemo(() => {
    return allProvidersWithModels
      .map((p) => p.models)
      .flat()
      .some((model) => isSpeechToTextModel(model.name));
  }, [allProvidersWithModels]);

  const getSpeechToTextClient = useCallback(
    (preferredModel?: string) => {
      let supported = false;
      const acceptableModel = (model: ChatCraftModel) =>
        preferredModel ? model.name === preferredModel : isSpeechToTextModel(model.name);

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

  useEffect(() => {
    const apiKey = settings.currentProvider.apiKey;
    if (!apiKey || isFetchingModels.current) {
      return;
    }

    const fetchModels = async () => {
      isFetchingModels.current = true;
      try {
        const models = await settings.currentProvider.queryModels(apiKey).then((models) => {
          return models.map((modelName) => new ChatCraftModel(modelName));
        });
        setModels(models);
        setSettings({ ...settings, model: pickDefaultModel(settings.model, models) });
      } catch (err) {
        console.warn("Unable to update OpenAI models, using defaults.", err);
        setModels(defaultModels);
        setError(err as Error);
      } finally {
        isFetchingModels.current = false;
      }
    };

    fetchModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.currentProvider]);

  const value = {
    models: models || defaultModels,
    allProvidersWithModels,
    allAvailableModels,
    error,
    isSpeechToTextSupported,
    getSpeechToTextClient,
  };

  return <ModelsContext.Provider value={value}>{children}</ModelsContext.Provider>;
};
