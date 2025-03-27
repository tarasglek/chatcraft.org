import { createResourcesForEnv, errorResponse } from "../utils";

interface Env {
  ENVIRONMENT: string;
  JWT_SECRET: string;
}

const defaultSystemProviders = (): SystemProviders => ({
  "Free AI Models": {
    apiUrl: "https://free-chatcraft-ai.deno.dev/api/v1",
    defaultModel: "auto",
    apiKey: "no-api-key",
    isSystemProvider: true,
  },
});

interface ProviderHandler {
  re: RegExp;
  url: string;
  password?: string;
}

async function systemProvidersForUser(
  providers: ProviderHandler[],
  user: User
): Promise<SystemProviders> {
  if (user.email) {
    for (const provider of providers) {
      // Test if the user's email matches the provider's regex
      if (provider.re.test(user.email)) {
        // Create Basic Auth header (username = user.email, password = "")
        const auth = "Basic " + btoa(`${user.email}:${provider.password ?? ""}`);

        const response = await fetch(provider.url, {
          headers: {
            Authorization: auth,
          },
        });

        if (response.ok) {
          const providerData = await response.json();
          return providerData as SystemProviders; // assuming providerData is in the expected SystemProviders format
        } else {
          console.error(
            `Error fetching from ${provider.url}:`,
            response.status,
            response.statusText
          );
        }
      }
    }
  }

  // Fallback to default system providers if none match or on fetch error
  return defaultSystemProviders();
}

function providersFromEnv(env: Record<string, string>): ProviderHandler[] {
  const providers: ProviderHandler[] = [];
  for (const [key, value] of Object.entries(env)) {
    if (key.startsWith("PROVIDER_")) {
      try {
        const parsed = JSON.parse(value);
        // Convert the parsed `re` string to a RegExp
        const provider: ProviderHandler = {
          re: new RegExp(parsed.re),
          url: parsed.url,
          password: parsed.password,
        };
        providers.push(provider);
      } catch (error) {
        console.error(`Error parsing value for ${key}:`, error);
      }
    }
  }
  return providers;
}
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const { tokenProvider } = createResourcesForEnv(env.ENVIRONMENT, request.url);
    const user = await tokenProvider.getVerifiedUser(request, env.JWT_SECRET);

    if (!user) {
      return Response.json(defaultSystemProviders(), { status: 200 });
    }

    const providers = providersFromEnv(env);
    const systemProviders = await systemProvidersForUser(providers, user);
    return Response.json(systemProviders, { status: 200 });
  } catch (err) {
    console.error(err);
    return errorResponse(500, `Unable to get system providers for user: ${err.message}`);
  }
};
