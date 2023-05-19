import { validateToken } from "../../github";
import { getAccessToken } from "../../utils";

interface Env {
  CHATCRAFT_ORG_BUCKET: R2Bucket;
  CLIENT_ID: string;
}

// GET https://chatcraft.org/api/share/{user}/{uuid}
// Anyone can request a shared chat (don't need a token)
export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const { CHATCRAFT_ORG_BUCKET } = env;
  const { user_uuid } = params;

  // We should receive [username, uuid]
  if (!(Array.isArray(user_uuid) && user_uuid.length === 2)) {
    return new Response(
      JSON.stringify({
        message: "Expected share URL of the form /api/share/{user}/{uuid}",
      }),
      { status: 400 }
    );
  }

  try {
    const key = user_uuid.join("/");
    const object = await CHATCRAFT_ORG_BUCKET.get(key);
    if (!object) {
      return new Response(
        JSON.stringify({
          message: `${key} not found`,
        }),
        { status: 404 }
      );
    }

    return new Response(object.body);
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({
        message: "Unable to get chat: " + err.message,
      }),
      {
        status: 500,
      }
    );
  }
};

// DELETE https://chatcraft.org/api/share/{user}/{uuid}
// Must include a bearer token and GitHub user must match token owner
export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const { CLIENT_ID, CHATCRAFT_ORG_BUCKET } = env;
  const token = getAccessToken(request);
  const { user_uuid } = params;

  // We should receive [username, uuid]
  if (!(Array.isArray(user_uuid) && user_uuid.length === 2)) {
    return new Response(
      JSON.stringify({
        message: "Expected share URL of the form /api/share/{user}/{uuid}",
      }),
      { status: 400 }
    );
  }

  try {
    const [user] = user_uuid;
    const ghUsername = await validateToken(token, CLIENT_ID);

    // Make sure this is the same username as the user who owns this token
    if (user !== ghUsername) {
      return new Response(
        JSON.stringify({
          message: "GitHub token does not match username",
        }),
        { status: 403 }
      );
    }

    const key = user_uuid.join("/");
    await CHATCRAFT_ORG_BUCKET.delete(key);

    return new Response(
      JSON.stringify({
        message: "Chat deleted successfully",
      }),
      {
        status: 200,
      }
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({
        message: "Unable to share chat: " + err.message,
      }),
      {
        status: 500,
      }
    );
  }
};
