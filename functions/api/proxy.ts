import { errorResponse, createResourcesForEnv } from "../utils";

interface Env {
  JWT_SECRET: string;
}

// Transform known HTML URLs to get raw content
const fixUrl = (url: string) =>
  url
    // Deal with GitHub HTML URLs to code.  For example:
    // https://github.com/<owner>/<repo>/blob/<branch>/<path> -> https://raw.githubusercontent.com
    .replace(/^https:\/\/github\.com\/(.*)\/blob\/(.*)$/, "https://raw.githubusercontent.com/$1/$2")
    // Fix gist URLs to get /raw data vs. HTML
    .replace(
      /^https:\/\/gist\.github\.com\/([a-zA-Z0-9_-]+)\/([a-f0-9]+)$/,
      "https://gist.githubusercontent.com/$1/$2/raw"
    );

// GET https://chatcraft.org/api/proxy?url=<encoded url...>
// Must include JWT in cookie, and user must match token owner
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const { ENVIRONMENT } = env;
  const { tokenProvider } = createResourcesForEnv(ENVIRONMENT, request.url);

  // There should be tokens in the cookies
  const { accessToken } = tokenProvider.getTokens(request);
  if (!accessToken) {
    return errorResponse(403, "Missing Access Token");
  }

  // Make sure the access token is valid and has API role
  try {
    const payload = await tokenProvider.verifyToken(accessToken, env.JWT_SECRET);
    if (!payload) {
      return errorResponse(403, "Invalid Access Token");
    }

    // Make sure this user has the `api` role
    if (payload.role !== "api") {
      return errorResponse(403, "Access Token missing 'api' role");
    }
  } catch (err) {
    return errorResponse(400, err.message);
  }

  // Proxy the request to url
  try {
    const urlParam = new URL(request.url).searchParams.get("url");
    if (!urlParam) {
      return errorResponse(400, "Missing url query param");
    }

    // Some URLs have better alternatives to get at the raw data
    const url = fixUrl(urlParam);

    return fetch(url, { headers: { "User-Agent": "chatcraft.org" } });
  } catch (err) {
    console.error(err);
    return errorResponse(500, `Unable to proxy url: ${err.message}`);
  }
};
