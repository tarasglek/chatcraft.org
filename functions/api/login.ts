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

let provider: string | null = "";
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
  provider = reqUrl.searchParams.get("provider") ? reqUrl.searchParams.get("provider") : provider;
  const code = reqUrl.searchParams.get("code");
  // Include ?chat_id=... to redirect back to a given chat in the client.  GitHub will
  // return it back to us via ?state=...
  const chatId = reqUrl.searchParams.get("chat_id") || reqUrl.searchParams.get("state");
  const { appUrl, isDev, tokenProvider } = createResourcesForEnv(env.ENVIRONMENT, request.url);

  if (provider === "google") {
    return handleGoogleLogin({
      // isDev,
      isDev: false,
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
