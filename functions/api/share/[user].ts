import { errorResponse } from "../../utils";
import { serializeToken, getTokens, verifyToken } from "../../token";

interface Env {
  CHATCRAFT_ORG_BUCKET: R2Bucket;
  JWT_SECRET: string;
}

// Get a list of the user's shared chats
export async function handleShareUser({
  accessToken,
  idToken,
  user,
  JWT_SECRET,
  CHATCRAFT_ORG_BUCKET,
}: {
  accessToken: string;
  idToken: string;
  user: string;
  JWT_SECRET: string;
  CHATCRAFT_ORG_BUCKET: R2Bucket;
}) {
  // Make sure we have a token, and that it matches the expected user
  try {
    const payload = await verifyToken(accessToken, JWT_SECRET);

    // Make sure this is the same username as the user who owns this token
    if (payload?.sub !== user) {
      return errorResponse(403, "Access Token does not match user");
    }
    // Make sure the access token has the right role
    if (payload?.role !== "api") {
      return errorResponse(403, "Access Token missing 'api' role");
    }
  } catch (err) {
    return errorResponse(400, err.message);
  }

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
        ["Content-Type", "application/json; charset=utf-8"],
        ["Set-Cookie", serializeToken("access_token", accessToken)],
        ["Set-Cookie", serializeToken("id_token", idToken)],
      ]),
    });
  } catch (err) {
    console.error(err);
    return errorResponse(500, `Unable to share chat: ${err.message}`);
  }
}

// GET https://chatcraft.org/api/share/:user
// Must include JWT in cookie, and user must match token owner
export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const { CHATCRAFT_ORG_BUCKET, JWT_SECRET } = env;
  const { accessToken, idToken } = getTokens(request);
  const { user } = params;

  if (!accessToken) {
    return errorResponse(403, "Missing Access Token");
  }

  if (!idToken) {
    return errorResponse(403, "Missing ID Token");
  }

  if (typeof user !== "string") {
    return errorResponse(400, "Incorrect username format");
  }

  return handleShareUser({ accessToken, idToken, user, JWT_SECRET, CHATCRAFT_ORG_BUCKET });
};
