import { lastlogin } from "@pomdtr/lastlogin";
import type { LastLoginOptions } from "@pomdtr/lastlogin";
import { TokenProvider } from "./token-provider";
import { errorResponse } from "./utils";
import { requestDevUserInfo } from "./github";
import { requestGoogleDevUserInfo } from "./google";

export async function handleLastLogin(
  request: Request,
  provider: "google" | "github",
  chatId: string | null,
  JWT_SECRET: string,
  tokenProvider: TokenProvider,
  appUrl: string
) {
  const wrapped_fetch = lastlogin(
    async (request) => {
      const email = request.headers.get("X-Lastlogin-Email");
      console.log(`X-Lastlogin-Email ${email}!`);
      if (!email) {
        return errorResponse(403, "Lastlogin failed us");
      }
      const avatarUrl = (provider === "google" ? requestGoogleDevUserInfo() : requestDevUserInfo())
        .avatarUrl;
      // User info goes in a non HTTP-Only cookie that browser can read
      const idToken = await tokenProvider.createToken(
        email,
        { username: email, name: email, avatarUrl },
        JWT_SECRET
      );
      // API authorization goes in an HTTP-Only cookie that only functions can read
      const accessToken = await tokenProvider.createToken(email, { role: "api" }, JWT_SECRET);

      // Return to the root or a specific chat if we have an id
      const url = new URL(chatId ? `/c/${chatId}` : "/", appUrl).href;

      return new Response(null, {
        status: 302,
        headers: new Headers([
          ["Location", url],
          ["Set-Cookie", tokenProvider.serializeToken("access_token", accessToken)],
          ["Set-Cookie", tokenProvider.serializeToken("id_token", idToken)],
        ]),
      });
    },
    {
      provider,
      verifyEmail: (_) => true, // we accept all emails
      secretKey: JWT_SECRET,
    }
  );

  return wrapped_fetch(request);
}
