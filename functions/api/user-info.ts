import { createResourcesForEnv } from "../utils";

interface Env {
  ENVIRONMENT: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const { tokenProvider } = createResourcesForEnv(env.ENVIRONMENT, request.url);
  const { accessToken, username } = tokenProvider.getTokens(request);

  const freeAINonLoggedIn = {
    name: "Free AI",
    apiUrl: "https://free-chatcraft-ai.deno.dev/api/v1",
    defaultModel: "auto",
    apiKey: "",
  };

  const freeAILoggedIn = {
    name: "Free AI",
    apiUrl: "https://free-chatcraft-ai.coolness.fyi/api/v1",
    defaultModel: "auto",
    apiKey: username,
  };

  const jsonHeaders = { "Content-Type": "application/json" };
  const responseBody = { providers: [accessToken ? freeAILoggedIn : freeAINonLoggedIn] };

  return new Response(JSON.stringify(responseBody), {
    status: 200,
    headers: jsonHeaders,
  });
};
