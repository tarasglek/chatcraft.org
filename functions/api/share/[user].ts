import { errorResponse } from "../../utils";
import { serializeToken, getTokens, verifyToken } from "../../token";

interface Env {
  CHATCRAFT_ORG_BUCKET: R2Bucket;
  JWT_SECRET: string;
}

// GET https://chatcraft.org/api/share/:user
// Must include JWT in cookie, and user must match token owner
export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const { CHATCRAFT_ORG_BUCKET, JWT_SECRET } = env;

  // There should be tokens in the cookies
  const { accessToken, idToken } = getTokens(request);
  if (!accessToken) {
    return errorResponse(403, "Missing Access Token");
  }

  // Make sure we have a token, and that it matches the expected user
  const { user } = params;
  try {
    const payload = await verifyToken(accessToken, JWT_SECRET);

    // Make sure this is the same username as the user who owns this token
    if (payload?.sub !== params.user) {
      return errorResponse(403, "Access Token does not match user");
    }
  } catch (err) {
    return errorResponse(400, err.message);
  }

  // Get a list of the user's shared chats
  try {
    // Build an array of ids and return
    const { objects } = await CHATCRAFT_ORG_BUCKET.list({ prefix: `${user}/` });
    const body = objects.map(({ key }) => ({
      key: key.replace(`${user}/`, ""),
      url: `https://chatcraft.org/c/${key}`,
    }));

    return new Response(JSON.stringify(body), {
      status: 200,
      // Update cookies to further delay expiry
      headers: new Headers([
        ["Set-Cookie", serializeToken("access_token", accessToken)],
        ["Set-Cookie", serializeToken("id_token", idToken)],
      ]),
    });
  } catch (err) {
    console.error(err);
    return errorResponse(500, `Unable to share chat: ${err.message}`);
  }
};
