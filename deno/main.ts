import { serveDir } from "jsr:@std/http/file-server";
import { route, type Route } from "jsr:@std/http/unstable-route";
import freshPathMapper from "jsr:@http/discovery/fresh-path-mapper";
import { discoverRoutes } from "jsr:@http/discovery/discover-routes";
import { asSerializablePattern } from "jsr:@http/discovery/as-serializable-pattern";
import { byPattern } from "jsr:@http/route/by-pattern";

async function cfRoutes(fileRootUrl: string) {
  const routes = await discoverRoutes({
    pattern: "/",
    fileRootUrl: fileRootUrl,
    pathMapper: freshPathMapper,
    verbose: true,
  });


  const handlers = [];

  for (const { pattern, module } of routes) {
    console.log("\nPattern:", asSerializablePattern(pattern));
    console.log("Module:", module.toString());
    const routeModule = await import(module.toString());
    console.log("Default:", routeModule.default);
    handlers.push(byPattern(pattern, routeModule.default));
  }
  return handlers;
}

// watchexec --verbose -i deno/** pnpm build
// https://jsr.io/@http/route and https://github.com/jollytoad/deno_http_fns/tree/main/packages/examples has newer fancier stuff
async function handleFetch(req: Request): Promise<Response> {
  const routes = await cfRoutes(import.meta.resolve("../functions")) as Route[];
  console.log(`${JSON.stringify(routes.map((x) => { p: x.pattern.pathname }))}`);

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
