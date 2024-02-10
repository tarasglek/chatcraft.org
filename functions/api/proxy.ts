import { errorResponse, createResourcesForEnv } from "../utils";
import { fetchData } from "../lib/data-handler";

interface Env {
  JWT_SECRET: string;
}

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

    let url: URL;
    try {
      url = new URL(urlParam);
    } catch (_) {
      return errorResponse(400, "Invalid url query param");
    }

    return fetchData(url);
  } catch (err) {
    console.error(err);
    return errorResponse(500, `Unable to proxy url: ${err.message}`);
  }
};
