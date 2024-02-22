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
import { OpenRouterProvider } from "../lib/providers/OpenRouterProvider";
// import { providerFromUrl } from "../lib/providers";

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

  // Get the OpenRouter.ai code, if present on the URL
  const searchParams = new URLSearchParams(window.location.search);
  const openRouterCode = searchParams.get("code");

  useEffect(() => {
    const handleOpenRouterCodeExchange = (code: string) => {
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
            const newProvider = new OpenRouterProvider(apiKey);
            setSettings({
              ...state,
              currentProvider: newProvider,
              providers: {
                ...state.providers,
                [newProvider.apiUrl]: newProvider,
              },
            });
            // Strip out openRouter's code from the URL
            searchParams.delete("code");
            const { origin, pathname, hash } = window.location;
            const urlWithoutCode = `${origin}${pathname}${hash}${searchParams.toString()}`;
            window.history.replaceState({}, document.title, urlWithoutCode);
          } else {
            console.error("OpenRouter OAuth PKCE response missing API key");
          }
        })
        .catch((error) => {
          console.error("Error authenticating with OpenRouter", error);
        });
    };

    if (openRouterCode) {
      handleOpenRouterCodeExchange(openRouterCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openRouterCode]);

  useEffect(() => {
    if (!settings) {
      setState(defaults);
      return;
    }

    // No current provider, check if we need to handle migration of deprecated apiKey, apiUrl
    // const { apiUrl, apiKey, ...restSettings } = settings as any;
    // if (apiKey && apiUrl) {
    //   const newProvider = providerFromUrl(apiUrl, apiKey);
    //   setState({
    //     ...restSettings,
    //     currentProvider: newProvider,
    //     providers: {
    //       ...restSettings.providers,
    //       [newProvider.apiUrl]: newProvider,
    //     },
    //   });

    //   console.warn("Migrated deprecated apiKey, apiUrl");
    //   return;
    // }

    setState(settings);

    // switching providers glitches if settings is set as dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
