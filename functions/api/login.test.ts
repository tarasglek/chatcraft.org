import { describe, test, expect } from "vitest";
import { decodeJwt } from "jose";

import { githubMocks } from "../github.test";
import { handleLogin } from "./login";

describe("/api/login", () => {
  test("/api/login without code should redirect to GitHub's OAuth login", async () => {
    const res = await handleLogin({
      code: null,
      chatId: null,
      CLIENT_ID: "client_id_1234",
      CLIENT_SECRET: "client_secret",
      JWT_SECRET: "jwt_secret",
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toEqual(
      "https://github.com/login/oauth/authorize?client_id=client_id_1234"
    );
  });

  test("/api/login without code and with chatId should redirect to GitHub's OAuth login with state", async () => {
    const res = await handleLogin({
      code: null,
      chatId: "123456",
      CLIENT_ID: "client_id_1234",
      CLIENT_SECRET: "client_secret",
      JWT_SECRET: "jwt_secret",
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

    const res = await handleLogin({
      code: "ghcode",
      chatId: null,
      CLIENT_ID: "client_id_1234",
      CLIENT_SECRET: "client_secret",
      JWT_SECRET: "jwt_secret",
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

    const res = await handleLogin({
      code: "ghcode",
      chatId: "123456",
      CLIENT_ID: "client_id_1234",
      CLIENT_SECRET: "client_secret",
      JWT_SECRET: "jwt_secret",
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toEqual("https://chatcraft.org/c/123456");
  });
});
