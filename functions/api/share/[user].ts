import { validateToken } from "../../github";
import { uuid, getAccessToken, successResponse, errorResponse } from "../../utils";

interface Env {
  CHATCRAFT_ORG_BUCKET: R2Bucket;
  CLIENT_ID: string;
  CLIENT_SECRET: string;
}

// GET https://chatcraft.org/api/share/{user}
// Must include a bearer token and GitHub user must match token owner
export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const { CLIENT_ID, CLIENT_SECRET, CHATCRAFT_ORG_BUCKET } = env;
  const token = getAccessToken(request);
  const { user } = params;

  // Make sure we have a token, and that it matches the expected user
  try {
    const ghUsername = await validateToken(token, CLIENT_ID, CLIENT_SECRET);

    // Make sure this is the same username as the user who owns this token
    if (user !== ghUsername) {
      return errorResponse(403, "GitHub token does not match username");
    }
  } catch (err) {
    return errorResponse(400, err.message);
  }

  // Get a list of the user's shared chats
  try {
    // Build an array of uuids and return
    const { objects } = await CHATCRAFT_ORG_BUCKET.list({ prefix: `${user}/` });
    return successResponse(
      objects.map(({ key }) => ({
        key: key.replace(`${user}/`, ""),
        url: `https://chatcraft.org/${key}`,
      }))
    );
  } catch (err) {
    console.error(err);
    return errorResponse(500, `Unable to share chat: ${err.message}`);
  }
};

// POST https://chatcraft.org/api/share/{user}
export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const { CLIENT_ID, CLIENT_SECRET, CHATCRAFT_ORG_BUCKET } = env;
  const token = getAccessToken(request);
  const { user } = params;

  // We expect JSON
  if (!request.headers.get("content-type").includes("application/json")) {
    return errorResponse(400, "Expected JSON");
  }

  // Make sure we have a token, and that it matches the expected user
  try {
    const ghUsername = await validateToken(token, CLIENT_ID, CLIENT_SECRET);

    // Make sure this is the same username as the user who owns this token
    if (user !== ghUsername) {
      return errorResponse(403, "GitHub token does not match username");
    }
  } catch (err) {
    return errorResponse(400, err.message);
  }

  // Put the chat into R2
  try {
    const id = uuid();
    const key = `${user}/${id}`;
    await CHATCRAFT_ORG_BUCKET.put(key, request.body);

    const url = `https://chatcraft.org/${key}`;
    return successResponse(
      {
        message: "Chat shared successfully",
        url,
        id,
      },
      201,
      new Headers({
        Location: url,
      })
    );
  } catch (err) {
    console.error(err);
    return errorResponse(500, `Unable to share chat: ${err.message}`);
  }
};
