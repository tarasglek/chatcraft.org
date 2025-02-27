import { createResourcesForEnv } from "../utils";

interface Env {
  ENVIRONMENT: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const { tokenProvider } = createResourcesForEnv(env.ENVIRONMENT, request.url);
  const { accessToken } = tokenProvider.getTokens(request);

  const jsonHeaders = { "Content-Type": "application/json" };
  const responseBody = accessToken ? { providers: [] } : {};

  return new Response(JSON.stringify(responseBody), {
    status: 200,
    headers: jsonHeaders,
  });
};
