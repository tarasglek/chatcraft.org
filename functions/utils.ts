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
