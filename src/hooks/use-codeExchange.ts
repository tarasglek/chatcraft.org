import { useState, useEffect } from "react";
import { useSettings } from "./use-settings";

const useCodeExchange = () => {
  const [apiKeyValue, setApiKeyValue] = useState("");
  const { settings, setSettings } = useSettings();

  //get code from the url
  const code = new URLSearchParams(window.location.search).get("code");

  const handleSetApiKey = (apiKey: string) => {
    setApiKeyValue(apiKey);
  };

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
          setSettings({ ...settings, apiKey: apiKey });
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

  return {
    apiKeyValue,
    handleSetApiKey,
  };
};

export default useCodeExchange;
