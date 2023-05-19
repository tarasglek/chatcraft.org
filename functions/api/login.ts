// TODO: check token https://docs.github.com/en/rest/apps/oauth-applications?apiVersion=2022-11-28#check-a-token

interface Env {
  CLIENT_ID: string;
  CLIENT_SECRET: string;
}

function buildUrl(url: string, params: { [key: string]: string }) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    searchParams.set(key, value);
  }

  const u = new URL(url);
  u.search = searchParams.toString();

  return u.href;
}

async function requestAccessToken(code: string, CLIENT_ID: string, CLIENT_SECRET: string) {
  const url = buildUrl("https://github.com/login/oauth/access_token", {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to get GitHub token: ${res.status} ${await res.text()}`);
  }

  const result = (await res.json()) as AccessTokenResponse;
  if (result.error) {
    throw new Error(`Error in GitHub token response: ${result.error}`);
  }

  return result.access_token;
}

// https://docs.github.com/en/rest/users/users?apiVersion=2022-11-28#get-the-authenticated-user
async function requestUserInfo(token: string) {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to get GitHub User info: ${res.status} ${await res.text()}`);
  }

  const { login, name, avatar_url } = (await res.json()) as UserInfoResponse;
  return { login, name, avatar: avatar_url };
}

// Handle CORS pre-flight request
export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
};

// Otherwise, exchange for an access_token
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const { CLIENT_ID, CLIENT_SECRET } = env;
  const reqUrl = new URL(request.url);
  const code = reqUrl.searchParams.get("code");

  // If we're missing the code, redirect to the GitHub Auth UI
  if (!code) {
    // TODO: make use of `redirect_uri` and `state`, see:
    // https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#1-request-a-users-github-identity
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
