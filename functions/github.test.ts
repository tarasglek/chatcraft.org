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
  "api.github.com": () => {
    const fetchMock = getMiniflareFetchMock();
    fetchMock.disableNetConnect();
    const origin = fetchMock.get("https://api.github.com");
    origin
      .intercept({ method: "GET", path: "/user" })
      .reply(200, { login: "login", name: "name", avatar_url: "avatar_url" });
    return origin;
  },
  all(mockAccessToken = "gho_access_token...") {
    this["github.com"](mockAccessToken);
    this["api.github.com"]();
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
    mocks["api.github.com"]();

    const user: User = await requestUserInfo(mockAccessToken);
    expect(user.username).toEqual("login");
    expect(user.name).toEqual("name");
    expect(user.avatarUrl).toEqual("avatar_url");
  });
});
