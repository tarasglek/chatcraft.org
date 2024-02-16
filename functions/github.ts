import { TokenProvider } from "./token-provider";
import { buildUrl } from "./utils";

export async function requestAccessToken(
  code: string,
  GITHUB_OAUTH_CLIENT_ID: string,
  GITHUB_OAUTH_CLIENT_SECRET: string
) {
  const url = buildUrl("https://github.com/login/oauth/access_token", {
    client_id: GITHUB_OAUTH_CLIENT_ID,
    client_secret: GITHUB_OAUTH_CLIENT_SECRET,
    code,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "User-Agent": "chatcraft.org",
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to get GitHub token: ${res.status} ${await res.text()}`);
  }

  const result = (await res.json()) as {
    error?: string;
    access_token: string;
  };
  if (result.error) {
    throw new Error(`Error in GitHub token response: ${result.error}`);
  }

  return result.access_token;
}

// https://docs.github.com/en/rest/users/users?apiVersion=2022-11-28#get-the-authenticated-user
export async function requestUserInfo(token: string): Promise<User> {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "chatcraft.org",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to get GitHub User info: ${res.status} ${await res.text()}`);
  }

  const { login, name, avatar_url } = (await res.json()) as {
    login: string;
    name: string | null;
    avatar_url: string;
  };

  return { username: login, name: name ?? login, avatarUrl: avatar_url };
}

// In development environments, we automatically log the user in without involving GitHub
export function requestDevUserInfo() {
  return {
    username: "chatcraft_dev",
    name: "ChatCraftDev",
    avatarUrl: "https://github.com/github.png?size=402",
  };
}

export function handleGithubLogin({
  isDev,
  code,
  chatId,
  GITHUB_OAUTH_CLIENT_ID,
  GITHUB_OAUTH_CLIENT_SECRET,
  JWT_SECRET,
  tokenProvider,
  appUrl,
}) {
  return isDev
    ? handleGithubDevLogin({ chatId, JWT_SECRET, tokenProvider, appUrl })
    : handleGithubProdLogin({
        code,
        chatId,
        GITHUB_OAUTH_CLIENT_ID,
        GITHUB_OAUTH_CLIENT_SECRET,
        JWT_SECRET,
        tokenProvider,
        appUrl,
      });
}
// Authenticate the user with GitHub, then create a JWT for use in ChatCraft.
// We store the token in a secure, HTTP-only cookie.
export async function handleGithubProdLogin({
  code,
  chatId,
  GITHUB_OAUTH_CLIENT_ID,
  GITHUB_OAUTH_CLIENT_SECRET,
  JWT_SECRET,
  tokenProvider,
  appUrl,
}: {
  code: string | null;
  chatId: string | null;
  GITHUB_OAUTH_CLIENT_ID: string;
  GITHUB_OAUTH_CLIENT_SECRET: string;
  JWT_SECRET: string;
  tokenProvider: TokenProvider;
  appUrl: string;
}) {
  // If we're missing the code, redirect to the GitHub Auth UI
  if (!code) {
    const url = buildUrl(
      "https://github.com/login/oauth/authorize",
      // If there's a chatId, piggy-back it on the request as state
      chatId
        ? { client_id: GITHUB_OAUTH_CLIENT_ID, state: "provider=github&chat_id=" + chatId }
        : { client_id: GITHUB_OAUTH_CLIENT_ID, state: "provider=github" }
    );
    return Response.redirect(url, 302);
  }

  // Otherwise, exchange the code for an access_token, then get user info
  // and use that to create JWTs for ChatCraft.
  try {
    const ghAccessToken = await requestAccessToken(
      code,
      GITHUB_OAUTH_CLIENT_ID,
      GITHUB_OAUTH_CLIENT_SECRET
    );
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
export async function handleGithubDevLogin({
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
