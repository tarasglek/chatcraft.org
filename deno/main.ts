// watchexec --verbose -i deno/** pnpm build
// deno run --unstable-net --unstable-sloppy-imports --watch -A serve-ssl.ts
import { serveDir } from "jsr:@std/http/file-server";
import freshPathMapper from "jsr:@http/discovery/fresh-path-mapper";
import { discoverRoutes } from "jsr:@http/discovery/discover-routes";
import { asSerializablePattern } from "jsr:@http/discovery/as-serializable-pattern";
import { byPattern } from "jsr:@http/route/by-pattern";
import { handle } from "jsr:@http/route/handle";

const env = {
  ENVIRONMENT: "development",
  CLIENT_ID: "client_id",
  CLIENT_SECRET: "client_secret", 
  JWT_SECRET: "jwt_secret",
  ...Deno.env.toObject()
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
function adaptLegacyCloudflareHandler(handler: Function) {
  return async (request: Request, _match: URLPatternResult) => {
    // Create minimal CF-style context object
    const ctx = {
      waitUntil: () => {},
      passThroughOnException: () => {},
    };

    // Call the legacy handler with CF-style arguments
    const response = await handler({ request, env, ctx });
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
    const modulePathShort = modulePath.substring(fileRootUrl.length);
    // Only include routes that start with /api and aren't tests
    const valid = modulePathShort.startsWith("/api") && !modulePathShort.includes(".test");
    if (!valid) {
      continue;
    }

    const routeModule = await import(modulePath);
    // console.log("Default:", routeModule.default);
    if (routeModule.onRequestGet) {
      console.log("Route:", asSerializablePattern(pattern), "->", modulePathShort);
      // console.log("onRequestGet:", routeModule.onRequestGet);
      handlers.push(byPattern(pattern, adaptLegacyCloudflareHandler(routeModule.onRequestGet)));
    }
  }
  return handlers;
}

const cfHandlers = await cfRoutes(import.meta.resolve("../functions"));

const serveOpts = { fsRoot: "build" };

export default {
  fetch: handle(cfHandlers, async (req: Request) => {
    let ret = await serveDir(req, serveOpts);
    if (ret.status === 404) {
      console.log("Got 404 from serveDir, trying with /:", req.url); // Add this line
      // Try again with /
      const url = new URL(req.url);
      url.pathname = "/";
      ret = await serveDir(new Request(url, req), serveOpts);
    }
    console.log(ret);
    return ret;
  }),
};
