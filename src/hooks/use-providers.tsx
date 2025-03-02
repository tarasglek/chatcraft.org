import { useMemo } from "react";
import { useUser } from "./use-user";
import { useSettings } from "./use-settings";
import { ProviderData } from "../lib/ChatCraftProvider";
import { providerFromJSON } from "../lib/providers";
import { nanoid } from "nanoid";
import { FreeModelProvider } from "../lib/providers/DefaultProvider/FreeModelProvider";

export function useProviders() {
  const { user } = useUser();
  const { settings } = useSettings();

  const systemProviders = useMemo(() => {
    const systemProviders = user?.systemProviders || {};

    const processedSystemProviders: ProviderData = {};
    for (const key in systemProviders) {
      const provider = providerFromJSON({ ...systemProviders[key], name: key, id: nanoid() });
      processedSystemProviders[key] = provider;
    }

    return {
      ...processedSystemProviders,
    };
  }, [user]);

  const userProviders = useMemo(() => {
    return {
      ...settings.providers,
      "Free AI Models": new FreeModelProvider(),
    };
  }, [settings]);

  const providers = useMemo(() => {
    return {
      ...systemProviders,
      ...userProviders,
    };
  }, [systemProviders, userProviders]);

  return {
    providers,
    systemProviders,
    userProviders,
  };
}
