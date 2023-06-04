import { requestAccessToken, requestUserInfo } from "../github";
import { buildUrl } from "../utils";
import { createToken, serializeToken } from "../token";

interface Env {
  CLIENT_ID: string;
  CLIENT_SECRET: string;
  JWT_SECRET: string;
}

// Authenticate the user with GitHub, then create a JWT for use in ChatCraft.
// We store the token in a secure, HTTP-only cookie.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const { CLIENT_ID, CLIENT_SECRET, JWT_SECRET } = env;
  const reqUrl = new URL(request.url);
  const code = reqUrl.searchParams.get("code");

  // If we're missing the code, redirect to the GitHub Auth UI
  if (!code) {
    const url = buildUrl("https://github.com/login/oauth/authorize", { client_id: CLIENT_ID });
    return Response.redirect(url, 302);
  }

  // Otherwise, exchange the code for an access_token, then get user info
  // and use that to create a JWT for ChatCraft.
  try {
    const ghAccessToken = await requestAccessToken(code, CLIENT_ID, CLIENT_SECRET);
    const user = await requestUserInfo(ghAccessToken);
    const chatCraftToken = await createToken(user, JWT_SECRET);

    return new Response(null, {
      status: 302,
      headers: new Headers({
        Location: "https://chatcraft.org/",
        "Set-Cookie": serializeToken(chatCraftToken),
      }),
    });
  } catch (err) {
    console.error(err);
    return Response.redirect(`https://chatcraft.org/?github_login_error`, 302);
  }
};
