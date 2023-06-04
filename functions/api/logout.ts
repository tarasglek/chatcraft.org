import { getTokens, verifyToken, serializeToken } from "../token";

interface Env {
  JWT_SECRET: string;
}

// Log a user out by setting the max-age of the `token` cookie to 0
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const { JWT_SECRET } = env;
  const { accessToken, idToken } = getTokens(request);

  // No token means user isn't logged in
  if (!accessToken) {
    return new Response(null, { status: 401 });
  }

  // A token we can't verify also means user isn't logged in
  const payload = await verifyToken(accessToken, JWT_SECRET);
  if (!payload) {
    return new Response(null, { status: 401 });
  }

  // User is logged in, expire their token/cookie
  return new Response(null, {
    status: 204,
    // Set max-age to 0 so browser deletes the cookie
    headers: new Headers([
      ["Set-Cookie", serializeToken("access_token", accessToken, 0)],
      ["Set-Cookie", serializeToken("id_token", idToken, 0)],
    ]),
  });
};
