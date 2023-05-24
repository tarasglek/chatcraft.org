import { validateToken } from "../../github";
import { getAccessToken, successResponse, errorResponse } from "../../utils";

interface Env {
  CHATCRAFT_ORG_BUCKET: R2Bucket;
  CLIENT_ID: string;
  CLIENT_SECRET: string;
}

// GET https://chatcraft.org/api/share/{user}/{uuid}
// Anyone can request a shared chat (don't need a token)
export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const { CHATCRAFT_ORG_BUCKET } = env;
  const { user_uuid } = params;

  // We should receive [username, uuid]
  if (!(Array.isArray(user_uuid) && user_uuid.length === 2)) {
    return errorResponse(400, "Expected share URL of the form /api/share/{user}/{uuid}");
  }

  try {
    const key = user_uuid.join("/");
    const object = await CHATCRAFT_ORG_BUCKET.get(key);
    if (!object) {
      return errorResponse(404, `${key} not found`);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);

    return new Response(object.body, {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error(err);
    return errorResponse(500, `Unable to get chat: ${err.message}`);
  }
};

// DELETE https://chatcraft.org/api/share/{user}/{uuid}
// Must include a bearer token and GitHub user must match token owner
export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const { CLIENT_ID, CLIENT_SECRET, CHATCRAFT_ORG_BUCKET } = env;
  const token = getAccessToken(request);
  const { user_uuid } = params;

  // We should receive [username, uuid]
  if (!(Array.isArray(user_uuid) && user_uuid.length === 2)) {
    return errorResponse(400, "Expected share URL of the form /api/share/{user}/{uuid}");
  }

  try {
    const [user] = user_uuid;
    const ghUsername = await validateToken(token, CLIENT_ID, CLIENT_SECRET);

    // Make sure this is the same username as the user who owns this token
    if (user !== ghUsername) {
      return errorResponse(403, "GitHub token does not match username");
    }

    const key = user_uuid.join("/");
    await CHATCRAFT_ORG_BUCKET.delete(key);

    return successResponse({
      message: "Chat deleted successfully",
    });
  } catch (err) {
    console.error(err);
    return errorResponse(500, `Unable to share chat: ${err.message}`);
  }
};
