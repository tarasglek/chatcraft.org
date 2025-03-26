import { describe, test, expect } from "vitest";

import { requestAccessToken, requestUserInfo } from "./github";

export const githubMocks = () => ({
  "github.com": (mockAccessToken = "gho_access_token...") => {
    // Mock the call to GitHub's OAuth login endpoint
    const fetchMock = getMiniflareFetchMock();
    fetchMock.disableNetConnect();
    const origin = fetchMock.get("https://github.com");
    origin
      .intercept({ method: "POST", path: /^\/login\/oauth\/access_token.+/ })
      .reply(200, { access_token: mockAccessToken });
    return origin;
  },
  "api.github.com": ({
    login,
    name,
    email,
    avatar_url,
  }: {
    login: string;
    email: string | null;
    name: string | null;
    avatar_url: string;
  }) => {
    const fetchMock = getMiniflareFetchMock();
    fetchMock.disableNetConnect();
    const origin = fetchMock.get("https://api.github.com");
    origin
      .intercept({ method: "GET", path: "/user" })
      .reply(200, { login, name, avatar_url, email });
    return origin;
  },
  all(mockAccessToken = "gho_access_token...") {
    this["github.com"](mockAccessToken);
    // Use default GH user details
    this["api.github.com"]({
      login: "login",
      name: "name",
      avatar_url: "avatar_url",
      email: "email",
    });
  },
});

describe("github.ts", () => {
  const mockAccessToken = "gho_access_token...";

  test("requestAccessToken()", async () => {
    const env = getMiniflareBindings();

    // Mock the call to GitHub's OAuth login endpoint
    const mocks = githubMocks();
    mocks["github.com"](mockAccessToken);

    const accessToken = await requestAccessToken("code", env.CLIENT_ID, env.CLIENT_SECRET);
    expect(accessToken).toEqual(mockAccessToken);
  });

  test("requestUserInfo()", async () => {
    // Mock the call to GitHub API /user endpoint
    const mocks = githubMocks();
    mocks["api.github.com"]({
      login: "login",
      name: "name",
      avatar_url: "avatar_url",
      email: "email",
    });

    const user: User = await requestUserInfo(mockAccessToken);
    expect(user.username).toEqual("login");
    expect(user.name).toEqual("name");
    expect(user.avatarUrl).toEqual("avatar_url");
    expect(user.email).toEqual("email");
  });

  test("requestUserInfo() when name not defined", async () => {
    // Mock the call to GitHub API /user endpoint, but set name to null
    const mocks = githubMocks();
    mocks["api.github.com"]({
      login: "login",
      name: null,
      avatar_url: "avatar_url",
      email: "email",
    });

    const user: User = await requestUserInfo(mockAccessToken);
    expect(user.username).toEqual("login");
    // Should re-use login name
    expect(user.name).toEqual("login");
    expect(user.avatarUrl).toEqual("avatar_url");
    expect(user.email).toEqual("email");
  });

  test("requestUserInfo() when email not defined", async () => {
    // Mock the call to GitHub API /user endpoint, but set name to null
    const mocks = githubMocks();
    mocks["api.github.com"]({ login: "login", name: null, avatar_url: "avatar_url", email: null });

    const user: User = await requestUserInfo(mockAccessToken);
    expect(user.username).toEqual("login");
    // Should re-use login name
    expect(user.name).toEqual("login");
    expect(user.avatarUrl).toEqual("avatar_url");
    expect(user.email).toEqual(null);
  });
});
