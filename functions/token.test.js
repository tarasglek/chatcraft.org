import { describe, test, expect } from "vitest";

import { createToken, verifyToken, getTokens, serializeToken } from "./token";

describe("token", () => {
  const secret = "secret";
  const subject = "subject";
  const payload = { claim: true };

  test("createToken() and verifyToken() work together", async () => {
    const token = await createToken(subject, payload, secret);
    const payload2 = await verifyToken(token, secret);
    expect(payload2).not.toBe(null);
    expect(payload2.claim).toEqual(payload.claim);
  });

  test("serialize access_token", async () => {
    const accessToken = await createToken(subject, payload, secret);
    const cookie = serializeToken("access_token", accessToken);
    expect(cookie).toContain(`__Host-access_token=${accessToken}`);
    expect(cookie).toContain("Max-Age=2592000");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Strict");
  });

  test("serialize access_token with maxAge=0", async () => {
    const accessToken = await createToken(subject, payload, secret);
    const cookie = serializeToken("access_token", accessToken, 0);
    expect(cookie).toContain(`__Host-access_token=${accessToken}`);
    expect(cookie).toContain("Max-Age=0");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Strict");
  });

  test("serialize id_token", async () => {
    const idToken = await createToken(subject, payload, secret);
    const cookie = serializeToken("id_token", idToken);
    expect(cookie).toContain(`__Host-id_token=${idToken}`);
    expect(cookie).toContain("Max-Age=2592000");
    expect(cookie).toContain("Path=/");
    expect(cookie).not.toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Strict");
  });

  test("serialize id_token with maxAge=0", async () => {
    const idToken = await createToken(subject, payload, secret);
    const cookie = serializeToken("id_token", idToken, 0);
    expect(cookie).toContain(`__Host-id_token=${idToken}`);
    expect(cookie).toContain("Max-Age=0");
    expect(cookie).toContain("Path=/");
    expect(cookie).not.toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Strict");
  });

  test("getTokens()", async () => {
    const accessToken =
      "eyJhbGciOiJIUzI1NiJ9.eyJjbGFpbSI6dHJ1ZSwiaXNzIjoiaHR0cHM6Ly9jaGF0Y3JhZnQub3JnIiwiYXVkIjoiaHR0cHM6Ly9jaGF0Y3JhZnQub3JnIiwic3ViIjoic3ViamVjdCJ9.vzCdERen7gniPYn_x5-5zlIemK5skgEXaBQrGVLkU78";
    const idToken =
      "eyJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoiQ2hhdCBDcmFmdCIsInVzZXJuYW1lIjoiY2hhdCIsImF2YXRhclVybCI6Imh0dHBzOi8vcHJvZmlsZS1waWMuY29tIiwiaXNzIjoiaHR0cHM6Ly9jaGF0Y3JhZnQub3JnIiwiYXVkIjoiaHR0cHM6Ly9jaGF0Y3JhZnQub3JnIiwic3ViIjoic3ViamVjdCJ9.FeptD-Cl4pKdJyAWq_iFQdmGOmWrlK_avnQbRoaaeO8";
    const req = new Request("http://chatcraft.org/", {
      headers: new Headers([
        ["Cookie", `__Host-access_token=${accessToken}`],
        ["Cookie", `__Host-id_token=${idToken}`],
      ]),
    });
    const tokens = getTokens(req);
    expect(tokens.accessToken).toEqual(accessToken);
    expect(tokens.idToken).toEqual(idToken);
  });
});
