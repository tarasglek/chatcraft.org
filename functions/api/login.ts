// TODO: check token https://docs.github.com/en/rest/apps/oauth-applications?apiVersion=2022-11-28#check-a-token

interface Env {
  CLIENT_ID: string;
  CLIENT_SECRET: string;
}

async function requestAccessToken(code: string, CLIENT_ID: string, CLIENT_SECRET: string) {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "chatcraft.org",
      accept: "application/json",
    },
    body: JSON.stringify({ CLIENT_ID, CLIENT_SECRET, code }),
  });
  const result = (await res.json()) as AccessTokenResponse;

  if (result.error) {
    throw new Error(`GitHub login error: ${result.error}`);
  }

  return result.access_token;
}

// https://docs.github.com/en/rest/users/users?apiVersion=2022-11-28#get-the-authenticated-user
async function requestUserInfo(token: string) {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!res.ok) {
    throw new Error(`GitHub error: unable to get user info: ${res.status} ${res.statusText}`);
  }

  const { login, name, avatar_url } = (await res.json()) as UserInfoResponse;
  return { login, name, avatar_url };
}

function buildChatCraftUrl(token: string, login: string, name: string, avatar: string) {
  const url = new URL("https://chatcraft.org/");

  const params = new URLSearchParams();
  params.set("token", token);
  params.set("username", login);
  params.set("name", name);
  params.set("avatar", avatar);
  url.search = params.toString();

  return url.href;
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
    return Response.redirect(
      `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}`,
      302
    );
  }

  // Otherwise, exchange the code for an access_token, then get user info
  try {
    const token = await requestAccessToken(code, CLIENT_ID, CLIENT_SECRET);
    const { login, name, avatar_url } = await requestUserInfo(token);
    const url = buildChatCraftUrl(token, login, name, avatar_url);

    return Response.redirect(url, 302);
  } catch (err) {
    console.error(err);
    return Response.redirect(`https://chatcraft.org/?github_login_error`, 302);
  }
};
