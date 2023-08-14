import { describe, test, expect } from "vitest";

import { TokenProvider } from "../token-provider";
import { handleLogout } from "./logout";

describe("Production /api/logout", () => {
  const tokenProvider = new TokenProvider("production", "https://chatcraft.org");
  const appUrl = "https://chatcraft.org/";

  test("/api/logout without access token should return 401", async () => {
    const JWT_SECRET = "secret";
    const accessToken = null;
    const idToken = await tokenProvider.createToken("subject", {}, JWT_SECRET);
    const res = await handleLogout({
      accessToken,
      chatId: null,
      idToken,
      JWT_SECRET,
      tokenProvider,
      appUrl,
    });
    expect(res.status).toBe(401);
  });

  test("/api/logout without id token should return 401", async () => {
    const JWT_SECRET = "secret";
    const accessToken = await tokenProvider.createToken("subject", {}, JWT_SECRET);
    const idToken = null;
    const res = await handleLogout({
      accessToken,
      chatId: null,
      idToken,
      JWT_SECRET,
      tokenProvider,
      appUrl,
    });
    expect(res.status).toBe(401);
  });

  test("/api/logout without proper access token should return 401", async () => {
    // Swap the secrets between creating and verifying tokens
    const accessToken = await tokenProvider.createToken("subject", {}, "old_secret");
    const idToken = await tokenProvider.createToken("subject", {}, "old_secret");
    const res = await handleLogout({
      accessToken,
      idToken,
      chatId: null,
      JWT_SECRET: "new_secret",
      tokenProvider,
      appUrl,
    });
    expect(res.status).toBe(401);
  });

  test("/api/logout should clear cookies", async () => {
    const JWT_SECRET = "secret";
    const accessToken = await tokenProvider.createToken("subject", {}, JWT_SECRET);
    const idToken = await tokenProvider.createToken("subject", {}, JWT_SECRET);
    const res = await handleLogout({
      accessToken,
      idToken,
      chatId: null,
      JWT_SECRET: JWT_SECRET,
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
          /__Host-access_token=[^;]+; Max-Age=0; Path=\/; HttpOnly; Secure; SameSite=Strict/
        );
      } else {
        expect(value).toMatch(/__Host-id_token=[^;]+; Max-Age=0; Path=\/; Secure; SameSite=Strict/);
      }
    });
  });

  test("/api/logout with ?chat_id should redirect back to specified chat", async () => {
    const JWT_SECRET = "secret";
    const accessToken = await tokenProvider.createToken("subject", {}, JWT_SECRET);
    const idToken = await tokenProvider.createToken("subject", {}, JWT_SECRET);
    const chatId = "123456";
    const res = await handleLogout({
      accessToken,
      idToken,
      chatId,
      JWT_SECRET: JWT_SECRET,
      tokenProvider,
      appUrl,
    });
    expect(res.status).toBe(302);

    expect(res.headers.get("Location")).toEqual(`https://chatcraft.org/c/${chatId}`);
  });
});

describe("Development /api/logout", () => {
  const tokenProvider = new TokenProvider("development", "http://localhost:9339");
  const appUrl = "http://localhost:9339/";

  test("/api/logout without access token should return 401", async () => {
    const JWT_SECRET = "secret";
    const accessToken = null;
    const idToken = await tokenProvider.createToken("subject", {}, JWT_SECRET);
    const res = await handleLogout({
      accessToken,
      chatId: null,
      idToken,
      JWT_SECRET,
      tokenProvider,
      appUrl,
    });
    expect(res.status).toBe(401);
  });

  test("/api/logout without id token should return 401", async () => {
    const JWT_SECRET = "secret";
    const accessToken = await tokenProvider.createToken("subject", {}, JWT_SECRET);
    const idToken = null;
    const res = await handleLogout({
      accessToken,
      chatId: null,
      idToken,
      JWT_SECRET,
      tokenProvider,
      appUrl,
    });
    expect(res.status).toBe(401);
  });

  test("/api/logout without proper access token should return 401", async () => {
    // Swap the secrets between creating and verifying tokens
    const accessToken = await tokenProvider.createToken("subject", {}, "old_secret");
    const idToken = await tokenProvider.createToken("subject", {}, "old_secret");
    const res = await handleLogout({
      accessToken,
      idToken,
      chatId: null,
      JWT_SECRET: "new_secret",
      tokenProvider,
      appUrl,
    });
    expect(res.status).toBe(401);
  });

  test("/api/logout should clear cookies", async () => {
    const JWT_SECRET = "secret";
    const accessToken = await tokenProvider.createToken("subject", {}, JWT_SECRET);
    const idToken = await tokenProvider.createToken("subject", {}, JWT_SECRET);
    const res = await handleLogout({
      accessToken,
      idToken,
      chatId: null,
      JWT_SECRET: JWT_SECRET,
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
        expect(value).toMatch(/access_token=[^;]+; Max-Age=0; Path=\/; HttpOnly; SameSite=Strict/);
      } else {
        expect(value).toMatch(/id_token=[^;]+; Max-Age=0; Path=\/; SameSite=Strict/);
      }
    });
  });

  test("/api/logout with ?chat_id should redirect back to specified chat", async () => {
    const JWT_SECRET = "secret";
    const accessToken = await tokenProvider.createToken("subject", {}, JWT_SECRET);
    const idToken = await tokenProvider.createToken("subject", {}, JWT_SECRET);
    const chatId = "123456";
    const res = await handleLogout({
      accessToken,
      idToken,
      chatId,
      JWT_SECRET: JWT_SECRET,
      tokenProvider,
      appUrl,
    });
    expect(res.status).toBe(302);

    expect(res.headers.get("Location")).toEqual(`http://localhost:9339/c/${chatId}`);
  });
});
