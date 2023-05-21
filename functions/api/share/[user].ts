import { validateToken } from "../../github";
import { uuid, getAccessToken } from "../../utils";

interface Env {
  CHATCRAFT_ORG_BUCKET: R2Bucket;
  CLIENT_ID: string;
}

// GET https://chatcraft.org/api/share/{user}
// Must include a bearer token and GitHub user must match token owner
export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const { CLIENT_ID, CHATCRAFT_ORG_BUCKET } = env;
  const token = getAccessToken(request);
  const { user } = params;

  try {
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

    // Build an array of uuids and return
    const { objects } = await CHATCRAFT_ORG_BUCKET.list({ prefix: `${user}/` });
    const uuids = objects.map(({ key }) => key.replace(`${user}/`, ""));
    return new Response(JSON.stringify(JSON.stringify(uuids)));
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({
        error: "Unable to share chat: " + err.message,
      }),
      {
        status: 500,
      }
    );
  }
};

// POST https://chatcraft.org/api/share/{user}
export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const { CLIENT_ID, CHATCRAFT_ORG_BUCKET } = env;
  const token = getAccessToken(request);
  const { user } = params;

  // We expect JSON
  if (!request.headers.get("content-type").includes("application/json")) {
    return new Response(
      JSON.stringify({
        message: "Expected JSON",
      }),
      { status: 400 }
    );
  }

  try {
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

    const key = `${user}/${uuid()}`;
    await CHATCRAFT_ORG_BUCKET.put(key, request.body);

    return new Response(
      JSON.stringify({
        message: "Chat shared successfully",
      }),
      {
        status: 201,
        headers: {
          Location: `https://chatcraft.org/${key}`,
        },
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
