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
 * e) if the current provider is a system one..newly added system provider becomes the default
 * f) we don't currently support deleting providers only replacing em...so if you get free provider while not logged in, then log in and get another one..the old free provider remains but is no longer the default
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

  let systemProviders = { [freeAINonLoggedIn.name]: freeAINonLoggedIn };
  if (username) {
    const freeAILoggedIn: Provider = {
      name: "Custom AI Providers",
      apiUrl: "https://free-chatcraft-ai.coolness.fyi/api/v1",
      defaultModel: "auto",
      apiKey: username,
    };

    systemProviders = { [freeAILoggedIn.name]: freeAILoggedIn };
  }

  const responseBody = { systemProviders };
  return Response.json(responseBody, { status: 200 });
};
