import { getTokens, verifyToken, serializeToken } from "../token";

interface Env {
  JWT_SECRET: string;
}

// Log a user out by setting the max-age of the `token` cookie to 0
export async function handleLogout({
  accessToken,
  idToken,
  JWT_SECRET,
  chatId,
}: {
  accessToken: string | null;
  idToken: string | null;
  JWT_SECRET: string;
  chatId: string | null;
}) {
  // No token means user isn't logged in
  if (!(accessToken && idToken)) {
    return new Response(null, { status: 401 });
  }

  // A token we can't verify also means user isn't logged in
  const payload = await verifyToken(accessToken, JWT_SECRET);
  if (!payload) {
    return new Response(null, { status: 401 });
  }

  // Return to the root or a specific chat if we have an id
  const url = new URL(chatId ? `/c/${chatId}` : "/", "https://chatcraft.org").href;

  // Expire the user's cookies
  return new Response(null, {
    status: 302,
    // Set max-age to 0 so browser deletes the cookie
    headers: new Headers([
      ["Location", url],
      ["Set-Cookie", serializeToken("access_token", accessToken, 0)],
      ["Set-Cookie", serializeToken("id_token", idToken, 0)],
    ]),
  });
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const { JWT_SECRET } = env;
  const { accessToken, idToken } = getTokens(request);
  const reqUrl = new URL(request.url);
  // Include ?chat_id=... to redirect back to a given chat in the client.
  const chatId = reqUrl.searchParams.get("chat_id");

  return handleLogout({ accessToken, idToken, chatId, JWT_SECRET });
};
