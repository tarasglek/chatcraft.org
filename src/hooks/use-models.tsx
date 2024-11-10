import {
  useState,
  useEffect,
  createContext,
  useContext,
  useRef,
  type ReactNode,
  type FC,
  useMemo,
} from "react";
import { ChatCraftModel } from "../lib/ChatCraftModel";
import { getSettings } from "../lib/settings";
import { useSettings } from "./use-settings";
import { isSpeechToTextModel } from "../lib/ai";
import { ChatCraftProviderWithModels } from "../lib/ChatCraftProvider";

const defaultModels = [getSettings().currentProvider.defaultModelForProvider()];

type ModelsContextType = {
  models: ChatCraftModel[];
  allProvidersWithModels: ChatCraftProviderWithModels[];
  error: Error | null;
  isSpeechToTextSupported: boolean;
};

const ModelsContext = createContext<ModelsContextType>({
  models: defaultModels,
  allProvidersWithModels: [],
  error: null,
  isSpeechToTextSupported: false,
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
    const providers = Object.values(settings.providers); // Get all providers

    if (isFetchingAllProvidersWithModels.current) {
      return; // Return early if there's no API key or we're already fetching
    }

    const fetchModelsForAllProviders = async () => {
      isFetchingAllProvidersWithModels.current = true;
      try {
        // Fetch models for all providers concurrently
        const fetchPromises = providers.map((provider) => {
          if (!provider.apiKey) return Promise.resolve([]); // Skip providers without an apiKey

          return provider.queryModels(provider.apiKey).then((models) => {
            return {
              ...provider,
              models: models.map((modelName) => new ChatCraftModel(modelName)),
            } as ChatCraftProviderWithModels;
          });
        });

        // Wait for all promises to resolve
        const allModelsData = await Promise.all(fetchPromises);

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

  const isSpeechToTextSupported = useMemo(() => {
    return allProvidersWithModels
      .map((p) => p.models)
      .flat()
      .some((model) => isSpeechToTextModel(model.name));
  }, [allProvidersWithModels]);

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
    error,
    isSpeechToTextSupported,
  };

  return <ModelsContext.Provider value={value}>{children}</ModelsContext.Provider>;
};
