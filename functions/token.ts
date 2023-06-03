import { parse } from "cookie";
import jwt from "jsonwebtoken";

export const createToken = (user: User, secretKey: string) => {
  const expiresIn = "30d";
  const payload = {
    aud: "https://chatcraft.org",
    sub: user.username,
    user,
  };
  return jwt.sign(payload, secretKey, { expiresIn });
};

export const verifyToken = (token: string, secretKey: string) => {
  try {
    const decoded = jwt.verify(token, secretKey) as JwtTokenPayload;
    return decoded;
  } catch (err) {
    console.warn(`Unable to verify token: ${err.message}`);
    return null;
  }
};

// Given an existing token, make a new one that expires later
export const refreshToken = (token: string, secretKey: string) => {
  const payload = verifyToken(token, secretKey);
  if (!payload) {
    return null;
  }

  return createToken(payload.user, secretKey);
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
