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
import { isTextToSpeechModel } from "../lib/ai";

const defaultModels = [getSettings().currentProvider.defaultModelForProvider()];

type ModelsContextType = {
  models: ChatCraftModel[];
  error: Error | null;
  isTtsSupported: boolean;
};

const ModelsContext = createContext<ModelsContextType>({
  models: defaultModels,
  error: null,
  isTtsSupported: false,
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
  const isFetching = useRef(false);
  const { settings, setSettings } = useSettings();

  const isTtsSupported = useMemo(() => {
    const availableModels = models || defaultModels;
    return !!availableModels.some((model) => isTextToSpeechModel(model.id));
  }, [models]);

  useEffect(() => {
    const apiKey = settings.currentProvider.apiKey;
    if (!apiKey || isFetching.current) {
      return;
    }

    const fetchModels = async () => {
      isFetching.current = true;
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
        isFetching.current = false;
      }
    };

    fetchModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.currentProvider]);

  const value = {
    models: models || defaultModels,
    error,
    isTtsSupported,
  };

  return <ModelsContext.Provider value={value}>{children}</ModelsContext.Provider>;
};
