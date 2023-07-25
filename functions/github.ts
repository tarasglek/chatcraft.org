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
