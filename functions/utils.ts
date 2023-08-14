import { TokenProvider } from "./token-provider";

// Build a URL with query params
export function buildUrl(url: string, params: { [key: string]: string }) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    searchParams.set(key, value);
  }

  const u = new URL(url);
  u.search = searchParams.toString();

  return u.href;
}

export function errorResponse(statusCode: number, message: string) {
  return new Response(JSON.stringify({ message }), { status: statusCode });
}

// Create a tokenProvider and appUrl for use in a function
export function createResourcesForEnv(environment: string, requestUrl: string) {
  const isDev = environment === "development";
  let origin: string;
  let appUrl: string;
  if (isDev) {
    origin = new URL(requestUrl).origin;
    appUrl = new URL("/", origin).href;
  } else {
    origin = "https://chatcraft.org";
    appUrl = "https://chatcraft.org/";
  }
  const tokenProvider = new TokenProvider(environment, origin);

  return { appUrl, isDev, tokenProvider };
}
