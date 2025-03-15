import { useEffect, useMemo, useState } from "react";
import { useUser } from "./use-user";
import { useSettings } from "./use-settings";
import { ChatCraftSystemProvider, ProviderData } from "../lib/ChatCraftProvider";
import { providerFromJSON } from "../lib/providers";
import { nanoid } from "nanoid";

export function useProviders() {
  const { user } = useUser();
  const { settings } = useSettings();
  const [systemProvidersResponse, setSystemProvidersResponse] = useState<
    SystemProviders | undefined
  >(undefined);

  useEffect(() => {
    fetch("/api/providers")
      .then((res) => {
        // If the server doesn't respond with what we expect, we'll use the default
        if (!res.ok) {
          throw new Error(`Server responded with ${res.status}`);
        }
        if (!res.headers.get("content-type")?.startsWith("application/json")) {
          throw new Error(`Server responded with non-JSON response`);
        }

        return res.json();
      })
      .then((data) => setSystemProvidersResponse(data))
      .catch((err) => {
        console.warn("Unable to get system providers, using default", err);
        setSystemProvidersResponse({
          "Free AI Models": {
            apiUrl: "https://free-chatcraft-ai.deno.dev/api/v1",
            defaultModel: "auto",
            apiKey: "no-api-key",
            isSystemProvider: true,
          },
        });
      });
  }, [user]);

  // Providers from the server
  const systemProviders = useMemo(() => {
    const systemProviders = systemProvidersResponse || {};

    // Otherwise, process all the system providers into something we can use locally
    const processedSystemProviders: ProviderData = {};
    for (const key in systemProviders) {
      const provider = providerFromJSON({ ...systemProviders[key], name: key, id: nanoid() });
      processedSystemProviders[key] = ChatCraftSystemProvider.fromProvider(provider);
    }

    return processedSystemProviders;
  }, [systemProvidersResponse]);

  // Providers in localStorage
  const userProviders = useMemo(() => settings.providers, [settings]);

  // Merged providers
  const providers = useMemo(() => {
    return {
      ...systemProviders,
      ...userProviders,
    };
  }, [systemProviders, userProviders]);

  return {
    providers,
  };
}
