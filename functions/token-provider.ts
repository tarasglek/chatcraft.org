import { parse, serialize } from "cookie";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export class TokenProvider {
  private origin: string;
  private accessTokenName: string;
  private idTokenName: string;
  private isDev: boolean;

  constructor(environment: string, origin: string) {
    this.origin = origin;

    // In production, we are more strict about the cookie
    this.isDev = environment === "development";
    this.accessTokenName = this.isDev ? "access_token" : "__Host-access_token";
    this.idTokenName = this.isDev ? "id_token" : "__Host-id_token";
  }

  // We allow passing a full User, or just a username
  async createToken(subject: string, payload: JWTPayload, secretKey: string) {
    const { origin } = this;
    const secret = new TextEncoder().encode(secretKey);
    const claims = new SignJWT(payload);
    const jwt = await claims
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer(origin)
      .setAudience(origin)
      .setSubject(subject)
      .sign(secret);

    return jwt;
  }

  async verifyToken(token: string, secretKey: string) {
    const { origin } = this;
    try {
      const secret = new TextEncoder().encode(secretKey);
      const { payload } = await jwtVerify(token, secret, {
        issuer: origin,
        audience: origin,
      });
      return payload;
    } catch (err) {
      console.warn(`Unable to verify token: ${err.message}`);
      return null;
    }
  }

  // Extract the JWT from a request's cookies
  getTokens(request: Request) {
    const cookieHeader = request.headers.get("Cookie");
    if (!cookieHeader) {
      return { accessToken: null, idToken: null };
    }

    const cookies = parse(cookieHeader);
    const { accessTokenName, idTokenName } = this;
    return {
      accessToken: cookies[accessTokenName] ?? null,
      idToken: cookies[idTokenName] ?? null,
    };
  }

  // Extract the JWTs from the request's cookies, verify them, and parse out the user info
  async getVerifiedUser(request: Request, secretKey: string) {
    const { accessToken, idToken } = this.getTokens(request);

    // Expect the access token to exist and be valid
    if (!accessToken) {
      return null;
    }
    const accessTokenPayload = await this.verifyToken(accessToken, secretKey);
    if (!accessTokenPayload) {
      return null;
    }

    // Expect the id token to exist and be valid
    if (!idToken) {
      return null;
    }
    const idTokenPayload = await this.verifyToken(idToken, secretKey);
    if (!idTokenPayload) {
      return null;
    }

    // Parse out the User info from the token
    const { username, name, avatarUrl, email } = idTokenPayload;
    if (typeof username === "string" && typeof name === "string" && typeof avatarUrl === "string") {
      // We have to have a username, name, and avatarUrl, but email is optional with GitHub
      return { username, name, avatarUrl, email } as User;
    }

    return null;
  }

  // Format for inclusion in Set-Cookie header. By default
  // use 30 day expiry, but allow override (e.g., 0 to remove cookie)
  // "Set-Cookie: __Host-SID=<session token>; path=/; Secure; HttpOnly; SameSite=Strict."
  serializeToken(name: "access_token" | "id_token", token: string, maxAge = 2592000) {
    const { isDev, accessTokenName, idTokenName } = this;
    const cookieName = name === "access_token" ? accessTokenName : idTokenName;

    return serialize(cookieName, token, {
      // Access tokens can't be read by browser, but id tokens can
      httpOnly: name === "access_token" ? true : false,
      maxAge,
      path: "/",
      sameSite: true,
      secure: !isDev,
    });
  }
}
