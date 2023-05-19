// TODO: check token https://docs.github.com/en/rest/apps/oauth-applications?apiVersion=2022-11-28#check-a-token

interface Env {
  CLIENT_ID: string;
  CLIENT_SECRET: string;
}

// Handle CORS pre-flight request
export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
};

// Redirect GET requests to the OAuth login page on github.com
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { CLIENT_ID } = context.env;
  // TODO: make use of `redirect_uri` and `state`, see:
  // https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#1-request-a-users-github-identity
  const url = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}`;

  return Response.redirect(url, 302);
};

// Handle POST callback from GitHub to get access_token
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const { CLIENT_ID, CLIENT_SECRET } = env;

  try {
    // Temporary session code, which we need to exchange for an access token
    // TODO: should validate `state` here too...
    // TODO: should probably deal with refresh_token to keen access_token alive, see
    // https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/refreshing-user-access-tokens#refreshing-a-user-access-token-with-a-refresh-token
    const { code } = (await request.json()) as LoginPostResponse;

    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "chatcraft.org",
        accept: "application/json",
      },
      body: JSON.stringify({ CLIENT_ID, CLIENT_SECRET, code }),
    });
    const result = (await response.json()) as AccessTokenResponse;

    if (result.error) {
      console.error(result.error);
      return Response.redirect(`https://chatcraft.org/?login_error`, 302);
    }

    return Response.redirect(`https://chatcraft.org/?token=${result.access_token}`, 302);
  } catch (error) {
    console.error(error);
    return new Response(error.message, {
      status: 500,
    });
  }
};
