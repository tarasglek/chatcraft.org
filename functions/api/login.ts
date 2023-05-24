import { requestAccessToken, requestUserInfo } from "../github";
import { buildUrl } from "../utils";

interface Env {
  CLIENT_ID: string;
  CLIENT_SECRET: string;
}

// Otherwise, exchange for an access_token
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const { CLIENT_ID, CLIENT_SECRET } = env;
  const reqUrl = new URL(request.url);
  const code = reqUrl.searchParams.get("code");

  // If we're missing the code, redirect to the GitHub Auth UI
  if (!code) {
    const url = buildUrl("https://github.com/login/oauth/authorize", { client_id: CLIENT_ID });
    return Response.redirect(url, 302);
  }

  // Otherwise, exchange the code for an access_token, then get user info
  try {
    const token = await requestAccessToken(code, CLIENT_ID, CLIENT_SECRET);
    const { login, name, avatar } = await requestUserInfo(token);
    const url = buildUrl("https://chatcraft.org/", { token, login, name, avatar });

    return Response.redirect(url, 302);
  } catch (err) {
    console.error(err);
    return Response.redirect(`https://chatcraft.org/?github_login_error`, 302);
  }
};
