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
import { queryOpenAiModels } from "../lib/ai";
import { useSettings } from "./use-settings";

const defaultModels = [new ChatCraftModel("gpt-3.5-turbo", "OpenAI")];

type ModelsContextType = {
  models: ChatCraftModel[];
  error: Error | null;
};

const ModelsContext = createContext<ModelsContextType>({
  models: defaultModels,
  error: null,
});

export const useModels = () => useContext(ModelsContext);

export const ModelsProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [models, setModels] = useState<ChatCraftModel[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [fetched, setFetched] = useState(false);
  const isFetching = useRef(false);
  const { settings } = useSettings();

  useEffect(() => {
    const apiKey = settings.apiKey;
    if (!apiKey || isFetching.current) {
      return;
    }

    const fetchModels = async () => {
      isFetching.current = true;
      try {
        const openAiModels = await queryOpenAiModels(apiKey).then((models) => {
          models.sort();
          return models.map((model) => new ChatCraftModel(model));
        });
        setModels(openAiModels);
        setFetched(true);
      } catch (err) {
        console.warn("Unable to update OpenAI models, using defaults.", err);
        setModels(defaultModels);
        setError(err as Error);
        setFetched(true);
      } finally {
        isFetching.current = false;
      }
    };

    if (!models) {
      fetchModels();
    }
  }, [settings.apiKey, models, setModels, fetched]);

  const value = {
    models: models || defaultModels,
    error,
  };

  return <ModelsContext.Provider value={value}>{children}</ModelsContext.Provider>;
};
