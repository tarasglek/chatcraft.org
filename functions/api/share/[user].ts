import { errorResponse } from "../../utils";
import { serializeToken, refreshToken, getToken, verifyToken } from "../../token";

interface Env {
  CHATCRAFT_ORG_BUCKET: R2Bucket;
  JWT_SECRET: string;
}

// GET https://chatcraft.org/api/share/:user
// Must include JWT in cookie, and user must match token owner
export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const { CHATCRAFT_ORG_BUCKET, JWT_SECRET } = env;

  // There has to be a token in the cookies
  const token = getToken(request);
  if (!token) {
    return errorResponse(403, "Missing token");
  }

  // Make sure we have a token, and that it matches the expected user
  const { user } = params;
  try {
    const payload = await verifyToken(token, JWT_SECRET);

    // Make sure this is the same username as the user who owns this token
    if (payload?.sub !== params.user) {
      return errorResponse(403, "Token does not match user");
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

    // Update token/cookie to further delay expiry
    const chatCraftToken = await refreshToken(token, JWT_SECRET);
    if (!chatCraftToken) {
      throw new Error("Unable to refresh token");
    }

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: new Headers({
        "Set-Cookie": serializeToken(chatCraftToken),
      }),
    });
  } catch (err) {
    console.error(err);
    return errorResponse(500, `Unable to share chat: ${err.message}`);
  }
};
