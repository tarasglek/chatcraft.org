import { describe, test, expect } from "vitest";
import { decodeJwt } from "jose";

import { githubMocks } from "../github.test";
import { handleProdLogin, handleDevLogin } from "./login";
import { TokenProvider } from "../token-provider";

describe("Production /api/login", () => {
  const tokenProvider = new TokenProvider("production", "https://chatcraft.org");
  const appUrl = "https://chatcraft.org/";

  test("/api/login without code should redirect to GitHub's OAuth login", async () => {
    const res = await handleProdLogin({
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
      "https://github.com/login/oauth/authorize?client_id=client_id_1234"
    );
  });

  test("/api/login without code and with chatId should redirect to GitHub's OAuth login with state", async () => {
    const res = await handleProdLogin({
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
    expect(params.get("state")).toEqual("123456");
  });

  test("/api/login with code should redirect to ChatCraft.org with cookies", async () => {
    // Mock GitHub OAuth and /user flow
    const mocks = githubMocks();
    mocks.all();

    const res = await handleProdLogin({
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

    const res = await handleProdLogin({
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

describe("Development /api/login", () => {
  const tokenProvider = new TokenProvider("development", "http://localhost:9339");
  const appUrl = "http://localhost:9339/";

  test("/api/login with code should redirect to ChatCraft.org with cookies", async () => {
    // Mock GitHub OAuth and /user flow
    const mocks = githubMocks();
    mocks.all();

    const res = await handleDevLogin({
      chatId: null,
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

    const res = await handleDevLogin({
      chatId: "123456",
      JWT_SECRET: "jwt_secret",
      tokenProvider,
      appUrl,
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toEqual("http://localhost:9339/c/123456");
  });
});
