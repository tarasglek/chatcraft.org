import { parse, serialize } from "cookie";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

// We allow passing a full User, or just a username
export const createToken = async (subject: string, payload: JWTPayload, secretKey: string) => {
  const secret = new TextEncoder().encode(secretKey);
  const claims = new SignJWT(payload);
  const jwt = await claims
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("https://chatcraft.org")
    .setAudience("https://chatcraft.org")
    .setSubject(subject)
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

// Extract the JWT from a request's cookies
export function getTokens(request: Request) {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) {
    return { accessToken: null, idToken: null };
  }

  const cookies = parse(cookieHeader);
  return {
    accessToken: cookies["__Host-access_token"] ?? null,
    idToken: cookies["__Host-id_token"] ?? null,
  };
}

// Format for inclusion in Set-Cookie header. By default
// use 30 day expiry, but allow override (e.g., 0 to remove cookie)

// Set-Cookie: __Host-SID=<session token>; path=/; Secure; HttpOnly; SameSite=Strict.

export function serializeToken(name: "access_token" | "id_token", token: string, maxAge = 2592000) {
  // Access tokens can't be read by browser, but id tokens can
  const httpOnly = name === "access_token" ? true : false;

  return serialize(`__Host-${name}`, token, {
    httpOnly,
    maxAge,
    path: "/",
    sameSite: true,
    secure: true,
  });
}
