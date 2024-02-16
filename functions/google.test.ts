import { describe, test, expect } from "vitest";

import { requestGoogleAccessToken, requestGoogleUserInfo } from "./google";

export const googleMocks = () => ({
  "google.com": (mockAccessToken = "google_access_token...") => {
    // Mock the call to GitHub's OAuth login endpoint
    const fetchMock = getMiniflareFetchMock();
    fetchMock.disableNetConnect();
    const origin = fetchMock.get("https://accounts.google.com");
    origin
      .intercept({ method: "POST", path: /^\/o\/oauth2\/token.+/ })
      .reply(200, { access_token: mockAccessToken });
    return origin;
  },
  "www.googleapis.com": ({
    email,
    name,
    picture,
  }: {
    email: string;
    name: string;
    picture: string;
  }) => {
    const fetchMock = getMiniflareFetchMock();
    fetchMock.disableNetConnect();
    const origin = fetchMock.get("https://www.googleapis.com");
    origin
      .intercept({ method: "GET", path: "/oauth2/v1/userinfo" })
      .reply(200, { email, name, picture });
    return origin;
  },
  all(mockAccessToken = "googleo_access_token...") {
    this["google.com"](mockAccessToken);
    // Use default user details
    this["www.googleapis.com"]({ email: "email", name: "name", picture: "picture" });
  },
});

describe("google.ts", () => {
  const mockAccessToken = "gho_access_token...";

  test("requestAccessToken()", async () => {
    const env = getMiniflareBindings();

    // Mock the call to GitHub's OAuth login endpoint
    const mocks = googleMocks();
    mocks["google.com"](mockAccessToken);

    const accessToken = await requestGoogleAccessToken("code", env.CLIENT_ID, env.CLIENT_SECRET);
    expect(accessToken).toEqual(mockAccessToken);
  });

  test("requestGoogleUserInfo()", async () => {
    // Mock the call to Google API /user endpoint
    const mocks = googleMocks();
    mocks["www.googleapis.com"]({ email: "email", name: "name", picture: "picture" });

    const user: User = await requestGoogleUserInfo(mockAccessToken);
    expect(user.username).toEqual("email");
    expect(user.name).toEqual("name");
    expect(user.avatarUrl).toEqual("picture");
  });
});
