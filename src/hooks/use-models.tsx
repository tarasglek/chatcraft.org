import {
  useState,
  useEffect,
  createContext,
  useContext,
  useRef,
  type ReactNode,
  type FC,
} from "react";
import { ChatCraftModel } from "../lib/ChatCraftModel";
import { queryModels, defaultModelForProvider } from "../lib/ai";
import { useSettings } from "./use-settings";

const defaultModels = [defaultModelForProvider()];

type ModelsContextType = {
  models: ChatCraftModel[];
  error: Error | null;
};

const ModelsContext = createContext<ModelsContextType>({
  models: defaultModels,
  error: null,
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

  return defaultModelForProvider();
};

export const ModelsProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [models, setModels] = useState<ChatCraftModel[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const isFetching = useRef(false);
  const { settings, setSettings } = useSettings();

  useEffect(() => {
    const apiKey = settings.currentProvider?.apiKey;
    if (!apiKey || isFetching.current) {
      return;
    }

    const fetchModels = async () => {
      isFetching.current = true;
      try {
        const models = await queryModels(apiKey).then((models) => {
          return models.map((modelName) => new ChatCraftModel(modelName));
        });
        models.sort((a, b) => a.prettyModel.localeCompare(b.prettyModel));
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
  };

  return <ModelsContext.Provider value={value}>{children}</ModelsContext.Provider>;
};
