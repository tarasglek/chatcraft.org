import { createResourcesForEnv } from "../utils";
import { handleGithubLogin } from "../github";
import { handleGoogleLogin } from "../google";
import { handleLastLogin } from "../lastlogin";

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
    return handleLastLogin(
      request,
      provider,
      chatId,
      JWT_SECRET,
      tokenProvider,
      appUrl
    );
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
