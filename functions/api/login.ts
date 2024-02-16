import { createResourcesForEnv } from "../utils";
import { handleGithubLogin } from "../github";
import { handleGoogleLogin } from "../google";

interface Env {
  ENVIRONMENT: string;
  CLIENT_ID: string;
  CLIENT_SECRET: string;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_REDIRECT_URI: string;
  GOOGLE_RESPONSE_TYPE: string;
  GOOGLE_SCOPE: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const {
    CLIENT_ID,
    CLIENT_SECRET,
    JWT_SECRET,
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
    GOOGLE_RESPONSE_TYPE,
    GOOGLE_SCOPE,
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

  if (provider === "google") {
    return handleGoogleLogin({
      isDev,
      code,
      chatId,
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI,
      GOOGLE_RESPONSE_TYPE,
      GOOGLE_SCOPE,
      JWT_SECRET,
      tokenProvider,
      appUrl,
    });
  } else {
    return handleGithubLogin({
      isDev,
      code,
      chatId,
      CLIENT_ID,
      CLIENT_SECRET,
      JWT_SECRET,
      tokenProvider,
      appUrl,
    });
  }
};
