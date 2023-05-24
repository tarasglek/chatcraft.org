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

// Create an error response to send back to the client
export function successResponse(body: any, statusCode = 200, headers?: Headers) {
  return new Response(JSON.stringify(body), { status: statusCode, headers });
}

export function errorResponse(statusCode: number, message: string) {
  return new Response(JSON.stringify({ message }), { status: statusCode });
}

// Extract the access token from the Authorization header
export function getAccessToken(request: Request) {
  const Authorization = request.headers.get("Authorization");

  // We should have `Bearer <token>`
  if (!/^[Bb]earer /.test(Authorization)) {
    return null;
  }

  return Authorization.replace(/^[Bb]earer\s*/, "");
}

export const uuid = () => crypto.randomUUID();
