import { validateToken } from "../../github";
import { getAccessToken, successResponse, errorResponse } from "../../utils";

interface Env {
  CHATCRAFT_ORG_BUCKET: R2Bucket;
  CLIENT_ID: string;
  CLIENT_SECRET: string;
}

// POST https://chatcraft.org/api/share/{user}
export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  const { CLIENT_ID, CLIENT_SECRET, CHATCRAFT_ORG_BUCKET } = env;
  const token = getAccessToken(request);
  // `user/id` is available as user_id
  const { user_id } = params;

  // We expect JSON
  if (!request.headers.get("content-type").includes("application/json")) {
    return errorResponse(400, "Expected JSON");
  }

  // We should receive [username, id]
  if (!(Array.isArray(user_id) && user_id.length === 2)) {
    return errorResponse(400, "Expected share URL of the form /api/share/{user}/{id}");
  }

  // Make sure we have a token, and that it matches the expected user
  try {
    const ghUsername = await validateToken(token, CLIENT_ID, CLIENT_SECRET);
    const [user] = user_id;

    // Make sure this is the same username as the user who owns this token
    if (user !== ghUsername) {
      return errorResponse(403, "GitHub token does not match username");
    }
  } catch (err) {
    return errorResponse(400, err.message);
  }

  // Put the chat into R2
  try {
    const key = user_id.join("/");
    await CHATCRAFT_ORG_BUCKET.put(key, request.body);

    const url = `https://chatcraft.org/${key}`;
    return successResponse(
      {
        message: "Chat shared successfully",
        url,
      },
      200,
      new Headers({
        Location: url,
      })
    );
  } catch (err) {
    console.error(err);
    return errorResponse(500, `Unable to share chat: ${err.message}`);
  }
};

// GET https://chatcraft.org/api/share/{user}/{id}
// Anyone can request a shared chat (don't need a token)
export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const { CHATCRAFT_ORG_BUCKET } = env;
  const { user_id } = params;

  // We should receive [username, id]
  if (!(Array.isArray(user_id) && user_id.length === 2)) {
    return errorResponse(400, "Expected share URL of the form /api/share/{user}/{id}");
  }

  try {
    const key = user_id.join("/");
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

// DELETE https://chatcraft.org/api/share/{user}/{id}
// Must include a bearer token and GitHub user must match token owner
export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const { CLIENT_ID, CLIENT_SECRET, CHATCRAFT_ORG_BUCKET } = env;
  const token = getAccessToken(request);
  const { user_id } = params;

  // We should receive [username, id]
  if (!(Array.isArray(user_id) && user_id.length === 2)) {
    return errorResponse(400, "Expected share URL of the form /api/share/{user}/{id}");
  }

  try {
    const [user] = user_id;
    const ghUsername = await validateToken(token, CLIENT_ID, CLIENT_SECRET);

    // Make sure this is the same username as the user who owns this token
    if (user !== ghUsername) {
      return errorResponse(403, "GitHub token does not match username");
    }

    const key = user_id.join("/");
    await CHATCRAFT_ORG_BUCKET.delete(key);

    return successResponse({
      message: "Chat deleted successfully",
    });
  } catch (err) {
    console.error(err);
    return errorResponse(500, `Unable to share chat: ${err.message}`);
  }
};
