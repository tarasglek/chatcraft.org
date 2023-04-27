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

const defaultSettings: Settings = {
  model: "gpt-3.5-turbo",
  enterBehaviour: "send",
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
  const [settings, setSettings] = useLocalStorage<Settings>("settings", defaultSettings);
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
