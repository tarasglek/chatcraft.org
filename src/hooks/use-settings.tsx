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

import { serializer, deserializer, key, defaults, type Settings } from "../lib/settings";

type SettingsContextType = {
  settings: Settings;
  setSettings: (newSettings: Settings) => void;
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaults,
  setSettings: () => {
    /* do nothing */
  },
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useLocalStorage<Settings>(key, defaults, {
    raw: false,
    serializer,
    deserializer,
  });

  const [state, setState] = useState<Settings>(settings || defaults);

  //get code from the url
  const code = new URLSearchParams(window.location.search).get("code");

  // const handleSetApiKey = (apiKey: string) => {
  //   setApiKeyValue(apiKey);
  // };

  const handleCodeExchange = (code: string) => {
    const requestBody = {
      code: code,
    };

    fetch("https://openrouter.ai/api/v1/auth/keys", {
      method: "POST",
      body: JSON.stringify(requestBody),
    })
      .then((response) => response.json())
      .then((data) => {
        const apiKey = data.key;
        if (apiKey !== undefined) {
          setSettings({ ...state, apiKey: apiKey });
          // Strip out code from the URL
          const urlWithoutCode = window.location.href.split("?")[0];
          window.history.replaceState({}, document.title, urlWithoutCode);
        } else {
          console.error("Error: API key is undefined.");
        }
      })
      .catch((error) => {
        console.error("Error authenticating with OpenRouter", error);
      });
  };

  useEffect(() => {
    if (code) {
      handleCodeExchange(code);
    }
  }, [code]);

  useEffect(() => {
    setState(settings || defaults);
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
