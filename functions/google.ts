import { buildUrl } from "./utils";

// https://developers.google.com/identity/protocols/oauth2/web-server#exchange-authorization-code
export async function requestGoogleAccessToken(
  code: string,
  CLIENT_ID: string,
  CLIENT_SECRET: string,
  GOOGLE_REDIRECT_URI: string
) {
  const url = buildUrl("https://accounts.google.com/o/oauth2/token", {
    code: code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: GOOGLE_REDIRECT_URI,
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

  return { username: email, name: name, avatarUrl: picture };
}

// In development environments, we automatically log the user in without involving GitHub
export function requestGoogleDevUserInfo() {
  return {
    username: "chatcraft_dev_google",
    name: "ChatCraftDevGoogle",
    avatarUrl:
      "https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg?size=402",
  };
}
