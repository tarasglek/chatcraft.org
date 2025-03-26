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

async function systemProvidersForUser(user: User): Promise<SystemProviders> {
  // TODO: do db lookup to figure out the providers for this user...
  return {
    "Amazing Models": {
      apiUrl: "https://free-chatcraft-ai.coolness.fyi/api/v1",
      defaultModel: "auto",
      apiKey: user.email ?? user.username,
      isSystemProvider: true,
    },
    "More Models": {
      apiUrl: "https://free-chatcraft-ai.coolness.fyi/api/v1",
      defaultModel: "auto",
      apiKey: user.email ?? user.username,
      isSystemProvider: true,
    },
  };
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const { tokenProvider } = createResourcesForEnv(env.ENVIRONMENT, request.url);
    const user = await tokenProvider.getVerifiedUser(request, env.JWT_SECRET);

    if (!user) {
      return Response.json(defaultSystemProviders(), { status: 200 });
    }

    const systemProviders = await systemProvidersForUser(user);
    return Response.json(systemProviders, { status: 200 });
  } catch (err) {
    console.error(err);
    return errorResponse(500, `Unable to get system providers for user: ${err.message}`);
  }
};
