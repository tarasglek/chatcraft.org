import { createResourcesForEnv } from "../utils";

interface Env {
  ENVIRONMENT: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const { tokenProvider } = createResourcesForEnv(env.ENVIRONMENT, request.url);
  const { accessToken } = tokenProvider.getTokens(request);

  if (accessToken) {
    return new Response(JSON.stringify({ providers: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
