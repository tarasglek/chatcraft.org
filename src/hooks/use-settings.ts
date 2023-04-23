import { useLocalStorage } from "react-use";

const defaultSettings: Settings = {
  model: "gpt-3.5-turbo",
  enterBehaviour: "send",
  promptPanelHeight: 120,
};

function useSettings() {
  const [settings, setSettings] = useLocalStorage<Settings>("settings", defaultSettings);

  return {
    settings: settings || defaultSettings,
    setSettings,
  };
}

export default useSettings;
