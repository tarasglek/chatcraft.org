import { serveDir } from "jsr:@std/http/file-server";
import { route, type Route } from "jsr:@std/http/unstable-route";
import freshPathMapper from "jsr:@http/discovery/fresh-path-mapper";
import { discoverRoutes } from "jsr:@http/discovery/discover-routes";
import { asSerializablePattern } from "jsr:@http/discovery/as-serializable-pattern";
import { byPattern } from "jsr:@http/route/by-pattern";

function adaptLegacyCloudflareHandler(handler: Function) {
  return async (request: Request) => {
    // Create minimal CF-style context object
    const env = {};
    const ctx = {
      waitUntil: () => {},
      passThroughOnException: () => {},
    };

    // Call the legacy handler with CF-style arguments
    const response = await handler(request, env, ctx);
    return response;
  };
}

async function cfRoutes(fileRootUrl: string) {
  const routes = await discoverRoutes({
    pattern: "/",
    fileRootUrl: fileRootUrl,
    pathMapper: freshPathMapper,
    verbose: true,
  });


  const handlers = [];

  for (const { pattern, module } of routes) {
    const modulePath = module.toString();
    const modulePathShort = modulePath.substring(fileRootUrl.length)
    // Only include routes that start with /api and aren't tests
    const valid = modulePathShort.startsWith('/api') && !modulePathShort.includes('.test');
    if (!valid) {
        continue;
    }
    
    console.log("\nPattern:", asSerializablePattern(pattern));
    console.log("Module:", modulePath);
    const routeModule = await import(modulePath);
    console.log("Default:", routeModule.default);
    console.log("onRequestGet:", routeModule.onRequestGet);
    
    if (routeModule.onRequestGet) {
      handlers.push(byPattern(pattern, adaptLegacyCloudflareHandler(routeModule.onRequestGet)));
    } else if (routeModule.default) {
      handlers.push(byPattern(pattern, routeModule.default));
    }
  }
  return handlers;
}

const routes = await cfRoutes(import.meta.resolve("../functions")) as Route[];


// watchexec --verbose -i deno/** pnpm build
// https://jsr.io/@http/route and https://github.com/jollytoad/deno_http_fns/tree/main/packages/examples has newer fancier stuff
async function handleFetch(req: Request): Promise<Response> {
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
