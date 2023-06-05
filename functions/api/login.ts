import { buildUrl } from "../utils";
import { requestAccessToken, requestUserInfo } from "../github";
import { createToken, serializeToken } from "../token";

interface Env {
  CLIENT_ID: string;
  CLIENT_SECRET: string;
  JWT_SECRET: string;
}

// Authenticate the user with GitHub, then create a JWT for use in ChatCraft.
// We store the token in a secure, HTTP-only cookie.
export async function handleLogin({
  code,
  CLIENT_ID,
  CLIENT_SECRET,
  JWT_SECRET,
}: {
  code: string | null;
  CLIENT_ID: string;
  CLIENT_SECRET: string;
  JWT_SECRET: string;
}) {
  // If we're missing the code, redirect to the GitHub Auth UI
  if (!code) {
    const url = buildUrl("https://github.com/login/oauth/authorize", { client_id: CLIENT_ID });
    return Response.redirect(url, 302);
  }

  // Otherwise, exchange the code for an access_token, then get user info
  // and use that to create JWTs for ChatCraft.
  try {
    const ghAccessToken = await requestAccessToken(code, CLIENT_ID, CLIENT_SECRET);
    const user = await requestUserInfo(ghAccessToken);
    // User info goes in a non HTTP-Only cookie that browser can read
    const idToken = await createToken(user.username, user, JWT_SECRET);
    // API authorization goes in an HTTP-Only cookie that only functions can read
    const accessToken = await createToken(user.username, { role: "api" }, JWT_SECRET);

    return new Response(null, {
      status: 302,
      headers: new Headers([
        ["Location", "https://chatcraft.org/"],
        ["Set-Cookie", serializeToken("access_token", accessToken)],
        ["Set-Cookie", serializeToken("id_token", idToken)],
      ]),
    });
  } catch (err) {
    console.error(err);
    return Response.redirect(`https://chatcraft.org/?github_login_error`, 302);
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const { CLIENT_ID, CLIENT_SECRET, JWT_SECRET } = env;
  const reqUrl = new URL(request.url);
  const code = reqUrl.searchParams.get("code");

  return handleLogin({ code, CLIENT_ID, CLIENT_SECRET, JWT_SECRET });
};
