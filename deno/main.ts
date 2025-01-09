// watchexec --verbose -i deno/** pnpm build
// deno run --unstable-net --unstable-sloppy-imports --watch -A serve-ssl.ts
import { serveDir } from "jsr:@std/http/file-server";
import freshPathMapper from "jsr:@http/discovery/fresh-path-mapper";
import { discoverRoutes } from "jsr:@http/discovery/discover-routes";
import { asSerializablePattern } from "jsr:@http/discovery/as-serializable-pattern";
import { byPattern } from "jsr:@http/route/by-pattern";
import { handle } from "jsr:@http/route/handle";
import * as path from "jsr:@std/path";

// we can probably share these with vite by factoring them into a common JSON
const defaults = {
  ENVIRONMENT: "development",
  CLIENT_ID: "client_id",
  CLIENT_SECRET: "client_secret",
  JWT_SECRET: "jwt_secret",
};

const env = {
  ...defaults,
  ...Deno.env.toObject(),
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

async function cfRoutes(fileRootUrl: string, prefix: string) {
  // Use path.join for proper path joining
  const fullFileRootUrl = path.join(fileRootUrl, prefix);

  const routes = await discoverRoutes({
    pattern: "/",
    fileRootUrl: fullFileRootUrl,
    pathMapper: freshPathMapper,
    verbose: true,
  });

  const handlers = [];

  for (const { pattern, module } of routes) {
    if (pattern instanceof URLPattern) {
      // Only destructure pathname
      const { pathname } = pattern;

      // Use path.join for prefixing the path
      const prefixedPath = path.join(prefix, pathname);

      // Create new pattern using original pattern's properties with new pathname
      const patternWithPrefix = new URLPattern({
        protocol: pattern.protocol,
        username: pattern.username,
        password: pattern.password,
        hostname: pattern.hostname,
        port: pattern.port,
        pathname: prefixedPath,
        search: pattern.search,
        hash: pattern.hash,
      });

      const modulePath = module.toString();
      const modulePathShort = modulePath.substring(fileRootUrl.length);
      const valid = modulePathShort.startsWith(prefix) && !modulePathShort.includes(".test");
      if (!valid) {
        continue;
      }

      const routeModule = await import(modulePath);
      if (routeModule.onRequestGet) {
        console.log("Route:", asSerializablePattern(patternWithPrefix), "->", modulePathShort);
        handlers.push(byPattern(patternWithPrefix, adaptLegacyCloudflareHandler(routeModule.onRequestGet)));
      }
    } else {
      throw new Error("Only expect URLPatterns");
    }
  }
  return handlers;
}

const cfHandlers = await cfRoutes(import.meta.resolve("../functions"), "/api");

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
