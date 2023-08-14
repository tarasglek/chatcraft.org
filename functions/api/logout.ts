import { TokenProvider } from "../token-provider";
import { createResourcesForEnv } from "../utils";

interface Env {
  ENVIRONMENT: string;
  JWT_SECRET: string;
}

// Log a user out by setting the max-age of the `token` cookie to 0
export async function handleLogout({
  accessToken,
  idToken,
  JWT_SECRET,
  chatId,
  tokenProvider,
  appUrl,
}: {
  accessToken: string | null;
  idToken: string | null;
  JWT_SECRET: string;
  chatId: string | null;
  tokenProvider: TokenProvider;
  appUrl: string;
}) {
  // No token means user isn't logged in
  if (!(accessToken && idToken)) {
    return new Response(null, { status: 401 });
  }

  // A token we can't verify also means user isn't logged in
  const payload = await tokenProvider.verifyToken(accessToken, JWT_SECRET);
  if (!payload) {
    return new Response(null, { status: 401 });
  }

  // Return to the root or a specific chat if we have an id
  const url = new URL(chatId ? `/c/${chatId}` : "/", appUrl).href;

  // Expire the user's cookies
  return new Response(null, {
    status: 302,
    // Set max-age to 0 so browser deletes the cookie
    headers: new Headers([
      ["Location", url],
      ["Set-Cookie", tokenProvider.serializeToken("access_token", accessToken, 0)],
      ["Set-Cookie", tokenProvider.serializeToken("id_token", idToken, 0)],
    ]),
  });
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const { JWT_SECRET } = env;
  const reqUrl = new URL(request.url);
  // Include ?chat_id=... to redirect back to a given chat in the client.
  const chatId = reqUrl.searchParams.get("chat_id");

  const { appUrl, tokenProvider } = createResourcesForEnv(env.ENVIRONMENT, request.url);
  const { accessToken, idToken } = tokenProvider.getTokens(request);

  return handleLogout({ accessToken, idToken, chatId, JWT_SECRET, tokenProvider, appUrl });
};
