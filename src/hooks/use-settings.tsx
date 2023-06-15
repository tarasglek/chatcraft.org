import {
  useState,
  useCallback,
  useEffect,
  createContext,
  useContext,
  type ReactNode,
  type FC,
} from "react";
import { useLocalStorage } from "react-use";
import { ChatCraftModel } from "../lib/ChatCraftModel";

type Settings = {
  apiKey?: string;
  model: ChatCraftModel;
  enterBehaviour: EnterBehaviour;
  justShowMeTheCode: boolean;
  countTokens: boolean;
  sidebarVisible: boolean;
};

const defaultSettings: Settings = {
  model: new ChatCraftModel("gpt-3.5-turbo", "OpenAI"),
  enterBehaviour: "send",
  // Disabled by default, since token parsing requires downloading larger deps
  countTokens: false,
  justShowMeTheCode: false,
  sidebarVisible: false,
};

type SettingsContextType = {
  settings: Settings;
  setSettings: (newSettings: Settings) => void;
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  setSettings: () => {
    /* do nothing */
  },
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useLocalStorage<Settings>("settings", defaultSettings, {
    raw: false,
    serializer(value: Settings) {
      return JSON.stringify(value);
    },
    deserializer(value: string) {
      const settings = JSON.parse(value);
      if (!settings.model) {
        settings.model = defaultSettings.model;
      }

      if (typeof settings.model === "string") {
        settings.model = new ChatCraftModel(settings.model);
      }

      return settings;
    },
  });
  const [state, setState] = useState<Settings>(settings || defaultSettings);

  useEffect(() => {
    setState(settings || defaultSettings);
  }, [settings]);

  const updateSettings = useCallback(
    (newSettings: Settings) => {
      const updated = { ...state, ...newSettings };
      setState(updated);
      setSettings(updated);
    },
    [state, setSettings]
  );

  const value = { settings: state, setSettings: updateSettings };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};
