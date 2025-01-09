import { createResourcesForEnv, errorResponse } from "../utils";
import { handleGithubLogin, requestDevUserInfo } from "../github";
import { handleGoogleLogin, requestGoogleDevUserInfo } from "../google";
import { lastlogin } from "@pomdtr/lastlogin";
import type { LastLoginOptions } from "@pomdtr/lastlogin";

interface Env {
  ENVIRONMENT: string;
  GITHUB_OAUTH_CLIENT_ID: string;
  GITHUB_OAUTH_CLIENT_SECRET: string;
  JWT_SECRET: string;
  GOOGLE_OAUTH_CLIENT_ID: string;
  GOOGLE_OUATH_CLIENT_SECRET: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const {
    GITHUB_OAUTH_CLIENT_ID,
    GITHUB_OAUTH_CLIENT_SECRET,
    JWT_SECRET,
    GOOGLE_OAUTH_CLIENT_ID,
    GOOGLE_OUATH_CLIENT_SECRET,
  } = env;
  const reqUrl = new URL(request.url);

  // Determine the login provider
  let provider = reqUrl.searchParams.get("provider");
  if (!provider) {
    let state = reqUrl.searchParams.get("state");
    if (state) {
      state = decodeURIComponent(state);
      const stateParams = new URLSearchParams(state);
      provider = stateParams.get("provider");
    }
  }

  if (!provider) {
    provider = "github";
  } else if (provider !== "google" && provider !== "github") {
    return errorResponse(403, `Invalid provider: ${provider}`);
  }

  // Include ?chat_id=... to redirect back to a given chat in the client.  Google will
  // return it back to us via ?state=provider%3Dgoogle%26chat_id%3Dl77...
  let chatId = reqUrl.searchParams.get("chat_id");
  if (!chatId) {
    let state = reqUrl.searchParams.get("state");
    if (state) {
      state = decodeURIComponent(state);
      const stateParams = new URLSearchParams(state);
      chatId = stateParams.get("chatId");
    }
  }

  const code = reqUrl.searchParams.get("code");

  const { appUrl, isDev, tokenProvider } = createResourcesForEnv(env.ENVIRONMENT, request.url);
  // use lastlogin for dev
  if (isDev) {
    const wrapped_fetch = lastlogin(async (request) => {
      const email = request.headers.get("X-Lastlogin-Email");
      console.log(`X-Lastlogin-Email ${email}!`);
      if (!email) {
        return errorResponse(403, "Lastlogin failed us");
      }
      const avatarUrl = (provider === "google" ? requestGoogleDevUserInfo() : requestDevUserInfo()).avatarUrl;
      // User info goes in a non HTTP-Only cookie that browser can read
      const idToken = await tokenProvider.createToken(email, { username: email, name: email, avatarUrl }, JWT_SECRET);
      // API authorization goes in an HTTP-Only cookie that only functions can read
      const accessToken = await tokenProvider.createToken(email, { role: "api" }, JWT_SECRET);

      // Return to the root or a specific chat if we have an id
      const url = new URL(chatId ? `/c/${chatId}` : "/", appUrl).href;

      return new Response(null, {
        status: 302,
        headers: new Headers([
          ["Location", url],
          ["Set-Cookie", tokenProvider.serializeToken("access_token", accessToken)],
          ["Set-Cookie", tokenProvider.serializeToken("id_token", idToken)],
        ]),
      });

    }, {
      provider: provider as LastLoginOptions["provider"],
      verifyEmail: _ => true, // we accept all emails
      secretKey: JWT_SECRET
    })
    return wrapped_fetch(request);
  }
  if (provider === "google") {
    return handleGoogleLogin({
      isDev,
      code,
      chatId,
      GOOGLE_OAUTH_CLIENT_ID,
      GOOGLE_OUATH_CLIENT_SECRET,
      JWT_SECRET,
      tokenProvider,
      appUrl,
    });
  } else {
    return handleGithubLogin({
      isDev,
      code,
      chatId,
      GITHUB_OAUTH_CLIENT_ID,
      GITHUB_OAUTH_CLIENT_SECRET,
      JWT_SECRET,
      tokenProvider,
      appUrl,
    });
  }
};
