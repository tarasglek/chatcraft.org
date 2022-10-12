
/** hello world cloudflare function in typescript */
export async function onRequest(context: {
  request: Request;
  env: { [key: string]: string };
  params: { [key: string]: string };
  waitUntil: (promise: Promise<any>) => void;
  next: () => Promise<void>;
  data: { [key: string]: any };
}) {
  // Contents of context object
  const {
    request, // same as existing Worker API
    env, // same as existing Worker API
    params, // if filename includes [id] or [[path]]
    waitUntil, // same as ctx.waitUntil in existing Worker API
    next, // used for middleware or to fetch assets
    data, // arbitrary space for passing data between middlewares
  } = context;

  return new Response(`Hello, world! ${request.url} ${request.method}`);
}