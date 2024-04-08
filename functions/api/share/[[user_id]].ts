import { Feed } from "feed";
import { DOMParser } from "linkedom";
import { errorResponse, createResourcesForEnv } from "../../utils";

interface Env {
  ENVIRONMENT: string;
  CHATCRAFT_ORG_BUCKET: R2Bucket;
  CLIENT_ID: string;
  CLIENT_SECRET: string;
  JWT_SECRET: string;
}

async function generateUserFeed(env: Env, user: string): Promise<void> {
  const { CHATCRAFT_ORG_BUCKET } = env;
  const prefix = `${user}/`;
  const { objects } = await CHATCRAFT_ORG_BUCKET.list({ prefix });
  const xsltUrl = "/rss-style.xsl";

  const feed = new Feed({
    title: `User Feed for ${user}`,
    description: `This is ${user}'s shared chats`,
    id: `https://chatcraft.org/api/share/${user}/feed.atom`,
    link: `https://chatcraft.org/api/share/${user}/feed.atom`,
    updated: new Date(),
    feedLinks: {
      atom: `https://chatcraft.org/api/share/${user}/feed.atom`,
    },
    author: {
      name: user,
    },
    copyright: `Copyright © ${new Date().getFullYear()} by ${user}`,
  });

  const sortedObjects = objects.sort((a, b) => b.uploaded.getTime() - a.uploaded.getTime());
  const recentObjects = sortedObjects.slice(0, 20);
  for (const object of recentObjects) {
    const chatData = await CHATCRAFT_ORG_BUCKET.get(object.key);
    if (chatData) {
      const chatContent = await chatData.text();
      const document = new DOMParser().parseFromString(chatContent, "text/html");

      const getTitle = document.querySelector('meta[property="og:title"]');
      const title = getTitle ? getTitle.getAttribute("content") : "No Title";

      const getSummary = document.querySelector('meta[property="og:description"]');
      const summary = getSummary ? getSummary.getAttribute("content") : "No Summary";

      const getUrl = document.querySelector('meta[property="og:url"]');
      const url = getUrl ? getUrl.getAttribute("content") : "No URL";

      const id = url.split("/").pop() || "No ID";

      const preContentElement = document.querySelector("pre");
      const preContent = preContentElement ? preContentElement.textContent : "";
      const dateMatch = preContent.match(/date:\s*(.+)/i);
      const date = dateMatch ? new Date(dateMatch[1]) : new Date();

      if (title !== "No Title" && url !== "No URL")
        feed.addItem({
          title: title,
          id: id,
          link: url,
          description: summary,
          date: date,
          author: [{ name: user }],
        });
    }
  }

  let feedXml = feed.atom1();

  // Remove the first line (second XML declaration) if it exists
  const lines = feedXml.split("\n");
  if (lines[0].startsWith("<?xml")) {
    lines.shift();
    feedXml = lines.join("\n");
  }

  feedXml =
    `<?xml version="1.0" encoding="UTF-8"?>\n<?xml-stylesheet type="text/xsl" href="${xsltUrl}"?>\n` +
    feedXml;

  try {
    const feedKey = `${user}/feed.atom`;
    await CHATCRAFT_ORG_BUCKET.put(feedKey, new TextEncoder().encode(feedXml), {
      httpMetadata: {
        contentType: "application/atom+xml",
      },
    });
    console.log(`Feed generated successfully for user: ${user}`);
  } catch (err) {
    console.error(`Unable to generate feed for ${user}: ${err.message}`);
  }
}

// POST https://chatcraft.org/api/share/:user/:id
// Must include JWT in cookie, and user must match token owner
export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  const { CHATCRAFT_ORG_BUCKET, JWT_SECRET, ENVIRONMENT } = env;
  const { tokenProvider } = createResourcesForEnv(ENVIRONMENT, request.url);

  // There should be tokens in the cookies
  const { accessToken, idToken } = tokenProvider.getTokens(request);
  if (!accessToken) {
    return errorResponse(403, "Missing Access Token");
  }
  if (!idToken) {
    return errorResponse(403, "Missing ID Token");
  }

  // We expect JSON
  const contentType = request.headers.get("Content-Type");
  if (!contentType?.includes("application/json") && !contentType?.includes("text/html")) {
    return errorResponse(400, "Expected JSON or HTML");
  }

  // We should receive [username, id] (i.e., `user/id` on path)
  const { user_id } = params;
  if (!(Array.isArray(user_id) && user_id.length === 2)) {
    return errorResponse(400, "Expected share URL of the form /api/share/{user}/{id}");
  }

  // Make sure the access token matches the expected user and limits.
  try {
    const payload = await tokenProvider.verifyToken(accessToken, JWT_SECRET);
    if (!payload) {
      return errorResponse(403, "Invalid Access Token");
    }

    // Make sure this is the same username as the user who owns this token
    const [user] = user_id;
    if (user !== payload.sub) {
      return errorResponse(403, "Access Token does not match username");
    }

    // Make sure this user has the `api` role
    if (payload.role !== "api") {
      return errorResponse(403, "Access Token missing 'api' role");
    }

    // Make sure this user hasn't exceeded sharing limits by inspecting bucket
    const now = new Date();
    const oneDayMS = 24 * 60 * 60 * 1000;
    const { objects } = await CHATCRAFT_ORG_BUCKET.list({ prefix: `${user}/` });
    // Only 1000 total shares per user
    if (objects.length > 1000) {
      return errorResponse(403, "Exceeded total share limit");
    }
    // Only 100 shares in 24 hours
    const recentShares = objects.filter(
      ({ uploaded }) => now.getTime() - uploaded.getTime() < oneDayMS
    );
    if (recentShares.length > 100) {
      return errorResponse(429, "Too many shares in a 24-hour period");
    }
  } catch (err) {
    return errorResponse(400, err.message);
  }

  // Put the chat into R2
  try {
    const key = user_id.join("/");
    await CHATCRAFT_ORG_BUCKET.put(key, request.body, {
      httpMetadata: {
        contentType: contentType,
      },
    });

    const [user] = user_id;
    await generateUserFeed(env, user);

    return new Response(
      JSON.stringify({
        message: "Chat shared successfully",
      }),
      {
        status: 200,
        // Update cookies to further delay expiry
        headers: new Headers([
          ["Content-Type", contentType],
          ["Set-Cookie", tokenProvider.serializeToken("access_token", accessToken)],
          ["Set-Cookie", tokenProvider.serializeToken("id_token", idToken)],
        ]),
      }
    );
  } catch (err) {
    console.error(err);
    return errorResponse(500, `Unable to share chat: ${err.message}`);
  }
};

// GET https://chatcraft.org/api/share/:user/:id
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

    // set to 'application/octet-stream' if content-type isn't set
    const contentType = object.httpMetadata.contentType || "application/octet-stream";
    headers.set("Content-Type", contentType);

    return new Response(object.body, {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error(err);
    return errorResponse(500, `Unable to get chat: ${err.message}`);
  }
};

// DELETE https://chatcraft.org/api/share/:user/:id
// Must include JWT in cookie, and user must match token owner
export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const { CHATCRAFT_ORG_BUCKET, JWT_SECRET, ENVIRONMENT } = env;
  const { tokenProvider } = createResourcesForEnv(ENVIRONMENT, request.url);

  // There should be tokens in the cookies
  const { accessToken, idToken } = tokenProvider.getTokens(request);
  if (!accessToken) {
    return errorResponse(403, "Missing Access Token");
  }
  if (!idToken) {
    return errorResponse(403, "Missing ID Token");
  }

  // We should receive [username, id] (i.e., `user/id` on path)
  const { user_id } = params;
  if (!(Array.isArray(user_id) && user_id.length === 2)) {
    return errorResponse(400, "Expected share URL of the form /api/share/{user}/{id}");
  }

  // Make sure we have a token, and that it matches the expected user
  try {
    const payload = await tokenProvider.verifyToken(accessToken, JWT_SECRET);

    // Make sure this is the same username as the user who owns this token
    const [user] = user_id;
    if (user !== payload?.sub) {
      return errorResponse(403, "Access Token does not match username");
    }
    if (payload?.role !== "api") {
      return errorResponse(403, "Access Token missing 'api' role");
    }
  } catch (err) {
    return errorResponse(400, err.message);
  }

  try {
    const key = user_id.join("/");
    await CHATCRAFT_ORG_BUCKET.delete(key);

    return new Response(
      JSON.stringify({
        message: "Chat deleted successfully",
      }),
      {
        status: 200,
        // Update cookies to further delay expiry
        headers: new Headers([
          ["Content-Type", "application/json; charset=utf-8"],
          ["Set-Cookie", tokenProvider.serializeToken("access_token", accessToken)],
          ["Set-Cookie", tokenProvider.serializeToken("id_token", idToken)],
        ]),
      }
    );
  } catch (err) {
    console.error(err);
    return errorResponse(500, `Unable to share chat: ${err.message}`);
  }
};
