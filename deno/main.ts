import { serveDir } from "jsr:@std/http/file-server";
import * as fsrouter from "jsr:@pomdtr/fsrouter";
import { route, type Route } from "jsr:@std/http/unstable-route";

// watchexec --verbose -i deno/** pnpm build
// https://jsr.io/@http/route and https://github.com/jollytoad/deno_http_fns/tree/main/packages/examples has newer fancier stuff
async function handleFetch(req: Request): Promise<Response> {
  const routes = fsrouter.discoverRoutes("./functions") as Route[];
  console.log(`${JSON.stringify(routes.map((x) => x.pattern.pathname))}`);

  return route(routes, async (req: Request) => {
    console.log("fallback", req);
    const ret = await serveDir(req, { fsRoot: "build" });
    console.log(ret);
    return ret;
  })(req);

  // return ;
}

export default {
  fetch: handleFetch,
};
