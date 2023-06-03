import { getToken, verifyToken, serializeToken } from "../token";

interface Env {
  JWT_SECRET: string;
}

// Log a user out by setting the max-age of the `token` cookie to 0
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const { JWT_SECRET } = env;
  const token = getToken(request);

  // No token means user isn't logged in
  if (!token) {
    return new Response(null, { status: 401 });
  }

  // A token we can't verify also means user isn't logged in
  const payload = verifyToken(token, JWT_SECRET);
  if (!payload) {
    return new Response(null, { status: 401 });
  }

  // User is logged in, expire their token/cookie
  return new Response(null, {
    status: 204,
    headers: new Headers({
      // Set max-age to 0 so browser deletes the cookie
      "Set-Cookie": serializeToken(token, 0),
    }),
  });
};
