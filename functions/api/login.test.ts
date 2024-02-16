import { describe, test, expect } from "vitest";
import { decodeJwt } from "jose";

import { githubMocks } from "../github.test";
import { googleMocks } from "../google.test";
import { handleGithubLogin } from "../github";
import { handleGoogleLogin } from "../google";
import { TokenProvider } from "../token-provider";

describe("Production Github /api/login", () => {
  const tokenProvider = new TokenProvider("production", "https://chatcraft.org");
  const appUrl = "https://chatcraft.org/";

  test("/api/login without code should redirect to GitHub's OAuth login", async () => {
    const res = await handleGithubLogin({
      isDev: false,
      code: null,
      chatId: null,
      CLIENT_ID: "client_id_1234",
      CLIENT_SECRET: "client_secret",
      JWT_SECRET: "jwt_secret",
      tokenProvider,
      appUrl,
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toEqual(
      "https://github.com/login/oauth/authorize?client_id=client_id_1234&state=provider%3Dgithub"
    );
  });

  test("/api/login without code and with chatId should redirect to GitHub's OAuth login with state", async () => {
    const res = await handleGithubLogin({
      isDev: false,
      code: null,
      chatId: "123456",
      CLIENT_ID: "client_id_1234",
      CLIENT_SECRET: "client_secret",
      JWT_SECRET: "jwt_secret",
      tokenProvider,
      appUrl,
    });

    expect(res.status).toBe(302);
    const location = res.headers.get("Location");
    expect(typeof location).toBe("string");
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const params = new URL(location!).searchParams;
    expect(params.get("client_id")).toEqual("client_id_1234");
    expect(params.get("state")).toEqual("provider=github&chat_id=123456");
  });

  test("/api/login with code should redirect to ChatCraft.org with cookies", async () => {
    // Mock GitHub OAuth and /user flow
    const mocks = githubMocks();
    mocks.all();

    const res = await handleGithubLogin({
      isDev: false,
      code: "ghcode",
      chatId: null,
      CLIENT_ID: "client_id_1234",
      CLIENT_SECRET: "client_secret",
      JWT_SECRET: "jwt_secret",
      tokenProvider,
      appUrl,
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toEqual("https://chatcraft.org/");

    res.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "set-cookie") {
        return;
      }

      if (value.startsWith("__Host-access_token")) {
        expect(value).toMatch(
          /__Host-access_token=[^;]+; Max-Age=2592000; Path=\/; HttpOnly; Secure; SameSite=Strict/
        );
        const matches = value.match(/__Host-access_token=([^;]+);/);
        expect(Array.isArray(matches)).toBe(true);
        expect(matches?.length).toBe(2);
        const accessToken = matches && matches[1];
        if (!accessToken) {
          expect.fail("missing access token");
        } else {
          const payload = decodeJwt(accessToken);
          expect(payload.sub).toEqual("login");
          expect(payload.role).toEqual("api");
        }
      } else {
        expect(value).toMatch(
          /__Host-id_token=[^;]+; Max-Age=2592000; Path=\/; Secure; SameSite=Strict/
        );
        const matches = value.match(/__Host-id_token=([^;]+);/);
        expect(Array.isArray(matches)).toBe(true);
        expect(matches?.length).toBe(2);
        const idToken = matches && matches[1];
        if (!idToken) {
          expect.fail("missing id token");
        } else {
          const payload = decodeJwt(idToken);
          expect(payload.sub).toEqual("login");
          expect(payload.username).toEqual("login");
          expect(payload.name).toEqual("name");
          expect(payload.avatarUrl).toEqual("avatar_url");
        }
      }
    });
  });

  test("/api/login with code and state should redirect to ChatCraft.org/c/:chatId", async () => {
    // Mock GitHub OAuth and /user flow
    const mocks = githubMocks();
    mocks.all();

    const res = await handleGithubLogin({
      isDev: false,
      code: "ghcode",
      chatId: "123456",
      CLIENT_ID: "client_id_1234",
      CLIENT_SECRET: "client_secret",
      JWT_SECRET: "jwt_secret",
      tokenProvider,
      appUrl,
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toEqual("https://chatcraft.org/c/123456");
  });
});

describe("Development Github /api/login", () => {
  const tokenProvider = new TokenProvider("development", "http://localhost:9339");
  const appUrl = "http://localhost:9339/";

  test("/api/login with code should redirect to ChatCraft.org with cookies", async () => {
    // Mock GitHub OAuth and /user flow
    const mocks = githubMocks();
    mocks.all();

    const res = await handleGithubLogin({
      isDev: true,
      code: null,
      chatId: null,
      CLIENT_ID: null,
      CLIENT_SECRET: null,
      JWT_SECRET: "jwt_secret",
      tokenProvider,
      appUrl,
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toEqual("http://localhost:9339/");

    res.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "set-cookie") {
        return;
      }

      if (value.startsWith("access_token")) {
        expect(value).toMatch(
          /access_token=[^;]+; Max-Age=2592000; Path=\/; HttpOnly; SameSite=Strict/
        );
        const matches = value.match(/access_token=([^;]+);/);
        expect(Array.isArray(matches)).toBe(true);
        expect(matches?.length).toBe(2);
        const accessToken = matches && matches[1];
        if (!accessToken) {
          expect.fail("missing access token");
        } else {
          const payload = decodeJwt(accessToken);
          expect(payload.sub).toEqual("chatcraft_dev");
          expect(payload.role).toEqual("api");
        }
      } else {
        expect(value).toMatch(/id_token=[^;]+; Max-Age=2592000; Path=\/; SameSite=Strict/);
        const matches = value.match(/id_token=([^;]+);/);
        expect(Array.isArray(matches)).toBe(true);
        expect(matches?.length).toBe(2);
        const idToken = matches && matches[1];
        if (!idToken) {
          expect.fail("missing id token");
        } else {
          const payload = decodeJwt(idToken);
          expect(payload.sub).toEqual("chatcraft_dev");
          expect(payload.username).toEqual("chatcraft_dev");
          expect(payload.name).toEqual("ChatCraftDev");
          expect(payload.avatarUrl).toEqual("https://github.com/github.png?size=402");
        }
      }
    });
  });

  test("/api/login with code and state should redirect to ChatCraft.org/c/:chatId", async () => {
    // Mock GitHub OAuth and /user flow
    const mocks = githubMocks();
    mocks.all();

    const res = await handleGithubLogin({
      isDev: true,
      code: null,
      chatId: "123456",
      CLIENT_ID: null,
      CLIENT_SECRET: null,
      JWT_SECRET: "jwt_secret",
      tokenProvider,
      appUrl,
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toEqual("http://localhost:9339/c/123456");
  });
});

describe("Production Google /api/login", () => {
  const tokenProvider = new TokenProvider("production", "https://chatcraft.org");
  const appUrl = "https://chatcraft.org/";

  test("/api/login without code should redirect to Google's OAuth login", async () => {
    const res = await handleGoogleLogin({
      isDev: false,
      code: null,
      chatId: null,
      GOOGLE_CLIENT_ID: "client_id_1234",
      GOOGLE_CLIENT_SECRET: "client_secret",
      GOOGLE_REDIRECT_URI: "https://chatcraft.org/api/login/",
      GOOGLE_RESPONSE_TYPE: "code",
      GOOGLE_SCOPE: "profile email",
      JWT_SECRET: "jwt_secret",
      tokenProvider,
      appUrl,
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toEqual(
      "https://accounts.google.com/o/oauth2/v2/auth?client_id=client_id_1234&redirect_uri=https%3A%2F%2Fchatcraft.org%2Fapi%2Flogin%2F&response_type=code&scope=profile+email&state=provider%3Dgoogle"
    );
  });

  test("/api/login without code and with chatId should redirect to Google's OAuth login with state", async () => {
    const res = await handleGoogleLogin({
      isDev: false,
      code: null,
      chatId: "123456",
      GOOGLE_CLIENT_ID: "client_id_1234",
      GOOGLE_CLIENT_SECRET: "client_secret",
      GOOGLE_REDIRECT_URI: "https://chatcraft.org/api/login/",
      GOOGLE_RESPONSE_TYPE: "code",
      GOOGLE_SCOPE: "profile email",
      JWT_SECRET: "jwt_secret",
      tokenProvider,
      appUrl,
    });

    expect(res.status).toBe(302);
    const location = res.headers.get("Location");
    expect(typeof location).toBe("string");
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const params = new URL(location!).searchParams;
    expect(params.get("client_id")).toEqual("client_id_1234");
    expect(params.get("state")).toEqual("provider=google&chat_id=123456");
  });

  test("/api/login with code should redirect to ChatCraft.org with cookies", async () => {
    // Mock Google OAuth and /user flow
    const mocks = googleMocks();
    mocks.all();

    const res = await handleGoogleLogin({
      isDev: false,
      code: "gcode",
      chatId: null,
      GOOGLE_CLIENT_ID: "client_id_1234",
      GOOGLE_CLIENT_SECRET: "client_secret",
      GOOGLE_REDIRECT_URI: "https://chatcraft.org/api/login/",
      GOOGLE_RESPONSE_TYPE: "code",
      GOOGLE_SCOPE: "profile email",
      JWT_SECRET: "jwt_secret",
      tokenProvider,
      appUrl,
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toEqual("https://chatcraft.org/");

    res.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "set-cookie") {
        return;
      }

      if (value.startsWith("__Host-access_token")) {
        expect(value).toMatch(
          /__Host-access_token=[^;]+; Max-Age=2592000; Path=\/; HttpOnly; Secure; SameSite=Strict/
        );
        const matches = value.match(/__Host-access_token=([^;]+);/);
        expect(Array.isArray(matches)).toBe(true);
        expect(matches?.length).toBe(2);
        const accessToken = matches && matches[1];
        if (!accessToken) {
          expect.fail("missing access token");
        } else {
          const payload = decodeJwt(accessToken);
          expect(payload.sub).toEqual("email");
          expect(payload.role).toEqual("api");
        }
      } else {
        expect(value).toMatch(
          /__Host-id_token=[^;]+; Max-Age=2592000; Path=\/; Secure; SameSite=Strict/
        );
        const matches = value.match(/__Host-id_token=([^;]+);/);
        expect(Array.isArray(matches)).toBe(true);
        expect(matches?.length).toBe(2);
        const idToken = matches && matches[1];
        if (!idToken) {
          expect.fail("missing id token");
        } else {
          const payload = decodeJwt(idToken);
          expect(payload.sub).toEqual("email");
          expect(payload.username).toEqual("email");
          expect(payload.name).toEqual("name");
          expect(payload.avatarUrl).toEqual("picture");
        }
      }
    });
  });

  test("/api/login with code and state should redirect to ChatCraft.org/c/:chatId", async () => {
    // Mock Google OAuth and /user flow
    const mocks = googleMocks();
    mocks.all();

    const res = await handleGoogleLogin({
      isDev: false,
      code: "gcode",
      chatId: "123456",
      GOOGLE_CLIENT_ID: "client_id_1234",
      GOOGLE_CLIENT_SECRET: "client_secret",
      GOOGLE_REDIRECT_URI: "https://chatcraft.org/api/login/",
      GOOGLE_RESPONSE_TYPE: "code",
      GOOGLE_SCOPE: "profile email",
      JWT_SECRET: "jwt_secret",
      tokenProvider,
      appUrl,
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toEqual("https://chatcraft.org/c/123456");
  });
});

describe("Development Google /api/login", () => {
  const tokenProvider = new TokenProvider("development", "http://localhost:9339");
  const appUrl = "http://localhost:9339/";

  test("/api/login with code should redirect to ChatCraft.org with cookies", async () => {
    // Mock Google OAuth and /user flow
    const mocks = googleMocks();
    mocks.all();

    const res = await handleGoogleLogin({
      isDev: true,
      code: null,
      chatId: null,
      GOOGLE_CLIENT_ID: null,
      GOOGLE_CLIENT_SECRET: null,
      GOOGLE_REDIRECT_URI: "https://chatcraft.org/api/login/",
      GOOGLE_RESPONSE_TYPE: "code",
      GOOGLE_SCOPE: "profile email",
      JWT_SECRET: "jwt_secret",
      tokenProvider,
      appUrl,
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toEqual("http://localhost:9339/");

    res.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "set-cookie") {
        return;
      }

      if (value.startsWith("access_token")) {
        expect(value).toMatch(
          /access_token=[^;]+; Max-Age=2592000; Path=\/; HttpOnly; SameSite=Strict/
        );
        const matches = value.match(/access_token=([^;]+);/);
        expect(Array.isArray(matches)).toBe(true);
        expect(matches?.length).toBe(2);
        const accessToken = matches && matches[1];
        if (!accessToken) {
          expect.fail("missing access token");
        } else {
          const payload = decodeJwt(accessToken);
          expect(payload.sub).toEqual("chatcraft_dev_google");
          expect(payload.role).toEqual("api");
        }
      } else {
        expect(value).toMatch(/id_token=[^;]+; Max-Age=2592000; Path=\/; SameSite=Strict/);
        const matches = value.match(/id_token=([^;]+);/);
        expect(Array.isArray(matches)).toBe(true);
        expect(matches?.length).toBe(2);
        const idToken = matches && matches[1];
        if (!idToken) {
          expect.fail("missing id token");
        } else {
          const payload = decodeJwt(idToken);
          expect(payload.sub).toEqual("chatcraft_dev_google");
          expect(payload.username).toEqual("chatcraft_dev_google");
          expect(payload.name).toEqual("ChatCraftDevGoogle");
          expect(payload.avatarUrl).toEqual(
            "https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg?size=402"
          );
        }
      }
    });
  });

  test("/api/login with code and state should redirect to ChatCraft.org/c/:chatId", async () => {
    // Mock Google OAuth and /user flow
    const mocks = googleMocks();
    mocks.all();

    const res = await handleGoogleLogin({
      isDev: true,
      code: null,
      chatId: "123456",
      GOOGLE_CLIENT_ID: null,
      GOOGLE_CLIENT_SECRET: null,
      GOOGLE_REDIRECT_URI: "https://chatcraft.org/api/login/",
      GOOGLE_RESPONSE_TYPE: "code",
      GOOGLE_SCOPE: "profile email",
      JWT_SECRET: "jwt_secret",
      tokenProvider,
      appUrl,
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toEqual("http://localhost:9339/c/123456");
  });
});
