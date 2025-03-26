import { TokenProvider } from "./token-provider";
import { buildUrl } from "./utils";

// https://developers.google.com/identity/protocols/oauth2/web-server#exchange-authorization-code
export async function requestGoogleAccessToken(
  code: string,
  GOOGLE_OAUTH_CLIENT_ID: string,
  GOOGLE_OUATH_CLIENT_SECRET: string
) {
  const url = buildUrl("https://accounts.google.com/o/oauth2/token", {
    code: code,
    client_id: GOOGLE_OAUTH_CLIENT_ID,
    client_secret: GOOGLE_OUATH_CLIENT_SECRET,
    redirect_uri: "https://chatcraft.org/api/login",
    grant_type: "authorization_code",
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "User-Agent": "chatcraft.org",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to get Google token: ${res.status} ${await res.text()}`);
  }

  const result = (await res.json()) as {
    error?: string;
    access_token: string;
  };
  if (result.error) {
    throw new Error(`Error in Google token response: ${result.error}`);
  }

  return result.access_token;
}

export async function requestGoogleUserInfo(token: string): Promise<User> {
  const res = await fetch("https://www.googleapis.com/oauth2/v1/userinfo", {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "chatcraft.org",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to get Google User info: ${res.status} ${await res.text()}`);
  }

  const { email, name, picture } = (await res.json()) as {
    email: string;
    name: string;
    picture: string;
  };

  return { username: email, name: name, avatarUrl: picture, email };
}

// In development environments, we automatically log the user in without involving Google
export function requestGoogleDevUserInfo() {
  return {
    username: "chatcraft_dev_google",
    name: "ChatCraftDevGoogle",
    avatarUrl:
      "https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg?size=402",
    email: "dev@chatcraft.org",
  };
}

export function handleGoogleLogin({
  isDev,
  code,
  chatId,
  GOOGLE_OAUTH_CLIENT_ID,
  GOOGLE_OUATH_CLIENT_SECRET,
  JWT_SECRET,
  tokenProvider,
  appUrl,
}) {
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
        GOOGLE_OAUTH_CLIENT_ID,
        GOOGLE_OUATH_CLIENT_SECRET,
        JWT_SECRET,
        tokenProvider,
        appUrl,
      });
}

export async function handleGoogleProdLogin({
  code,
  chatId,
  GOOGLE_OAUTH_CLIENT_ID,
  GOOGLE_OUATH_CLIENT_SECRET,
  JWT_SECRET,
  tokenProvider,
  appUrl,
}: {
  code: string | null;
  chatId: string | null;
  GOOGLE_OAUTH_CLIENT_ID: string;
  GOOGLE_OUATH_CLIENT_SECRET: string;
  JWT_SECRET: string;
  tokenProvider: TokenProvider;
  appUrl: string;
}) {
  // If we're missing the code, redirect to the Google Auth UI
  if (!code) {
    const url = buildUrl(
      "https://accounts.google.com/o/oauth2/v2/auth",
      // If there's a chatId, piggy-back it on the request as state
      chatId
        ? {
            client_id: GOOGLE_OAUTH_CLIENT_ID,
            redirect_uri: "https://chatcraft.org/api/login",
            response_type: "code",
            scope: "profile email",
            state: "provider=google&chat_id=" + chatId,
          }
        : {
            client_id: GOOGLE_OAUTH_CLIENT_ID,
            redirect_uri: "https://chatcraft.org/api/login",
            response_type: "code",
            scope: "profile email",
            state: "provider=google",
          }
    );
    return Response.redirect(url, 302);
  }

  // Otherwise, exchange the code for an access_token, then get user info
  // and use that to create JWTs for ChatCraft.
  try {
    const googleAccessToken = await requestGoogleAccessToken(
      code,
      GOOGLE_OAUTH_CLIENT_ID,
      GOOGLE_OUATH_CLIENT_SECRET
    );
    const user = await requestGoogleUserInfo(googleAccessToken);
    // User info goes in a non HTTP-Only cookie that browser can read
    const idToken = await tokenProvider.createToken(user.username, user, JWT_SECRET);
    // API authorization goes in an HTTP-Only cookie that only functions can read
    const accessToken = await tokenProvider.createToken(
      user.username,
      {
        role: "api",
      },
      JWT_SECRET
    );

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
    const accessToken = await tokenProvider.createToken(
      user.username,
      {
        role: "api",
      },
      JWT_SECRET
    );

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
