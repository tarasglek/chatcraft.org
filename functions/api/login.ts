import { buildUrl, createResourcesForEnv } from "../utils";
import { requestAccessToken, requestUserInfo, requestDevUserInfo } from "../github";
import {
  requestGoogleAccessToken,
  requestGoogleDevUserInfo,
  requestGoogleUserInfo,
} from "../google";
import { TokenProvider } from "../token-provider";

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

// Authenticate the user with GitHub, then create a JWT for use in ChatCraft.
// We store the token in a secure, HTTP-only cookie.
export async function handleProdLogin({
  code,
  chatId,
  CLIENT_ID,
  CLIENT_SECRET,
  JWT_SECRET,
  tokenProvider,
  appUrl,
}: {
  code: string | null;
  chatId: string | null;
  CLIENT_ID: string;
  CLIENT_SECRET: string;
  JWT_SECRET: string;
  tokenProvider: TokenProvider;
  appUrl: string;
}) {
  // If we're missing the code, redirect to the GitHub Auth UI
  if (!code) {
    const url = buildUrl(
      "https://github.com/login/oauth/authorize",
      // If there's a chatId, piggy-back it on the request as state
      chatId ? { client_id: CLIENT_ID, state: chatId } : { client_id: CLIENT_ID }
    );
    return Response.redirect(url, 302);
  }

  // Otherwise, exchange the code for an access_token, then get user info
  // and use that to create JWTs for ChatCraft.
  try {
    const ghAccessToken = await requestAccessToken(code, CLIENT_ID, CLIENT_SECRET);
    const user = await requestUserInfo(ghAccessToken);
    // User info goes in a non HTTP-Only cookie that browser can read
    const idToken = await tokenProvider.createToken(user.username, user, JWT_SECRET);
    // API authorization goes in an HTTP-Only cookie that only functions can read
    const accessToken = await tokenProvider.createToken(user.username, { role: "api" }, JWT_SECRET);

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
  } catch (err) {
    console.error(err);
    return Response.redirect(`https://chatcraft.org/?github_login_error`, 302);
  }
}

// In development, we simulate a GitHub login.
export async function handleDevLogin({
  chatId,
  JWT_SECRET,
  tokenProvider,
  appUrl,
}: {
  chatId: string | null;
  JWT_SECRET: string;
  tokenProvider: TokenProvider;
  appUrl: string;
}) {
  try {
    const user = requestDevUserInfo();
    // User info goes in a non HTTP-Only cookie that browser can read
    const idToken = await tokenProvider.createToken(user.username, user, JWT_SECRET);
    // API authorization goes in an HTTP-Only cookie that only functions can read
    const accessToken = await tokenProvider.createToken(user.username, { role: "api" }, JWT_SECRET);

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
  } catch (err) {
    console.error(err);
    return Response.redirect(`/?github_login_error`, 302);
  }
}

export async function handleGoogleProdLogin({
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
}: {
  code: string | null;
  chatId: string | null;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
  GOOGLE_RESPONSE_TYPE: string;
  GOOGLE_SCOPE: string;
  JWT_SECRET: string;
  tokenProvider: TokenProvider;
  appUrl: string;
}) {
  // If we're missing the code, redirect to the Google Auth UI
  if (!code) {
    // const state = JSON.stringify({ provider: "google", chatId: chatId });
    const url = buildUrl(
      "https://accounts.google.com/o/oauth2/v2/auth",
      // If there's a chatId, piggy-back it on the request as state
      chatId
        ? {
            client_id: GOOGLE_CLIENT_ID,
            redirect_uri: GOOGLE_REDIRECT_URI,
            response_type: GOOGLE_RESPONSE_TYPE,
            scope: GOOGLE_SCOPE,
            state: chatId,
          }
        : {
            client_id: GOOGLE_CLIENT_ID,
            redirect_uri: GOOGLE_REDIRECT_URI,
            response_type: GOOGLE_RESPONSE_TYPE,
            scope: GOOGLE_SCOPE,
          }
    );
    return Response.redirect(url, 302);
  }

  // Otherwise, exchange the code for an access_token, then get user info
  // and use that to create JWTs for ChatCraft.
  try {
    const googleAccessToken = await requestGoogleAccessToken(
      code,
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );
    const user = await requestGoogleUserInfo(googleAccessToken);
    // User info goes in a non HTTP-Only cookie that browser can read
    const idToken = await tokenProvider.createToken(user.username, user, JWT_SECRET);
    // API authorization goes in an HTTP-Only cookie that only functions can read
    const accessToken = await tokenProvider.createToken(user.username, { role: "api" }, JWT_SECRET);

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
  } catch (err) {
    console.error(err);
    return Response.redirect(`https://chatcraft.org/?google_login_error`, 302);
  }
}

// In development, we simulate a Google login.
export async function handleGoogleDevLogin({
  chatId,
  JWT_SECRET,
  tokenProvider,
  appUrl,
}: {
  chatId: string | null;
  JWT_SECRET: string;
  tokenProvider: TokenProvider;
  appUrl: string;
}) {
  try {
    const user = requestGoogleDevUserInfo();
    // User info goes in a non HTTP-Only cookie that browser can read
    const idToken = await tokenProvider.createToken(user.username, user, JWT_SECRET);
    // API authorization goes in an HTTP-Only cookie that only functions can read
    const accessToken = await tokenProvider.createToken(user.username, { role: "api" }, JWT_SECRET);

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
  } catch (err) {
    console.error(err);
    return Response.redirect(`/?google_login_error`, 302);
  }
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
  provider = reqUrl.searchParams.get("provider") ? reqUrl.searchParams.get("provider") : provider;
  const code = reqUrl.searchParams.get("code");
  // Include ?chat_id=... to redirect back to a given chat in the client.  GitHub will
  // return it back to us via ?state=...
  const chatId = reqUrl.searchParams.get("chat_id") || reqUrl.searchParams.get("state");
  const { appUrl, isDev, tokenProvider } = createResourcesForEnv(env.ENVIRONMENT, request.url);

  if (provider === "google") {
    return isDev
      ? handleGoogleDevLogin({
          chatId,
          JWT_SECRET,
          tokenProvider,
          appUrl,
        })
      : handleGoogleProdLogin({
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
    return isDev
      ? handleDevLogin({ chatId, JWT_SECRET, tokenProvider, appUrl })
      : handleProdLogin({
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
