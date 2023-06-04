import { parse } from "cookie";
import { SignJWT, jwtVerify } from "jose";

export const createToken = async (user: User, secretKey: string) => {
  const payload = {
    sub: user.username,
    user,
  };
  const secret = new TextEncoder().encode(secretKey);
  const claims = new SignJWT(payload);
  const jwt = await claims
    .setProtectedHeader({ alg: "HS256 " })
    .setIssuer("https://chatcraft.org")
    .setAudience("https://chatcraft.org")
    .sign(secret);

  return jwt;
};

export const verifyToken = async (token: string, secretKey: string) => {
  try {
    const secret = new TextEncoder().encode(secretKey);
    const { payload } = await jwtVerify(token, secret, {
      issuer: "https://chatcraft.org",
      audience: "https://chatcraft.org",
    });
    return payload;
  } catch (err) {
    console.warn(`Unable to verify token: ${err.message}`);
    return null;
  }
};

// Given an existing token, make a new one that expires later
export const refreshToken = async (token: string, secretKey: string) => {
  const payload = await verifyToken(token, secretKey);
  if (!payload) {
    return null;
  }

  const { user } = payload;
  if (!user || !(user["name"] && user["username"] && user["avatarUrl"])) {
    return null;
  }

  const newToken = await createToken(user as User, secretKey);
  return newToken;
};

// Extract the JWT from a request's cookies
export function getToken(request: Request) {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) {
    return null;
  }

  const cookies = parse(cookieHeader);
  return cookies.token ?? null;
}

// Format for inclusion in Set-Cookie header. By default
// use 30 day expiry, but allow override (e.g., 0 to remove cookie)
// We allow the client to read this cookie, since it contains user info.
export function serializeToken(token: string, maxAge = 2592000) {
  return `token=${token}; Secure; Domain=chatcraft.org; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}
