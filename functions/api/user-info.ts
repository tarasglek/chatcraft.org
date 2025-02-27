import { createResourcesForEnv } from "../utils";

interface Env {
  ENVIRONMENT: string;
  JWT_SECRET: string;
}

interface Provider {
  name: string;
  apiUrl: string;
  defaultModel: string;
  apiKey: string;
}

/**
 * Calling /api/user-info will return user info. Part of that user-info is systemProviders. System providers should be overwritable from server. Thus no need to conflict resolution if local provider settings different from user ones
 * a) so if user already has a provider of same name as 'system' one..then we log error message and leaver user's provider as is
 * b) if user already has a provider of same name marked 'system', then we are free to replace it
 * c) if user does not have a provider as returned by systemProviders, we add it
 * d) if user has no other providers, the provider that just got added becomes the default
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const { tokenProvider } = createResourcesForEnv(env.ENVIRONMENT, request.url);
  const { accessToken } = tokenProvider.getTokens(request);

  let username: string | null = null;
  if (accessToken) {
    const payload = await tokenProvider.verifyToken(accessToken, env.JWT_SECRET);
    username = payload?.sub ?? null;
  }

  const freeAINonLoggedIn: Provider = {
    name: "Free AI",
    apiUrl: "https://free-chatcraft-ai.deno.dev/api/v1",
    defaultModel: "auto",
    apiKey: "",
  };

  let systemProviders = [freeAINonLoggedIn];
  if (username) {
    const freeAILoggedIn: Provider = {
      name: "Free AI",
      apiUrl: "https://free-chatcraft-ai.coolness.fyi/api/v1",
      defaultModel: "auto",
      apiKey: username,
    };

    systemProviders = [freeAILoggedIn];
  }

  const jsonHeaders = { "Content-Type": "application/json" };
  const responseBody = { systemProviders };

  return new Response(JSON.stringify(responseBody), {
    status: 200,
    headers: jsonHeaders,
  });
};
