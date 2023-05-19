import { buildUrl } from "./utils";

export async function requestAccessToken(code: string, CLIENT_ID: string, CLIENT_SECRET: string) {
  const url = buildUrl("https://github.com/login/oauth/access_token", {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
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

  const result = (await res.json()) as AccessTokenResponse;
  if (result.error) {
    throw new Error(`Error in GitHub token response: ${result.error}`);
  }

  return result.access_token;
}

// https://docs.github.com/en/rest/users/users?apiVersion=2022-11-28#get-the-authenticated-user
export async function requestUserInfo(token: string) {
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

  const { login, name, avatar_url } = (await res.json()) as UserInfoResponse;
  return { login, name, avatar: avatar_url };
}

// https://docs.github.com/en/rest/apps/oauth-applications?apiVersion=2022-11-28#check-a-token
export async function validateToken(token: string | null, client_id: string) {
  if (typeof token !== "string") {
    throw new Error("Missing GitHub Access Token");
  }

  const res = await fetch(`https://api.github.com/applications/${client_id}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "chatcraft.org",
    },
  });

  if (!res.ok) {
    throw new Error(`GitHub token validation failed: ${res.status} ${await res.text()}`);
  }

  const { user } = (await res.json()) as ValidateTokenResponse;
  return user.login;
}
