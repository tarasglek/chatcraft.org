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

/**
 * Adapts a Cloudflare Workers-style module to a modern fetch handler.
 * 
 * @param {string} modulePath - The full path to the module to import
 * @param {boolean} [verbose=false] - Whether to enable verbose logging
 * @returns {Function|null} - A fetch handler function or null if the module is invalid
 * 
 * @example
 * const handler = adaptCloudflareHandler('/path/to/module.ts');
 * if (handler) {
 *   app.get('/route', handler);
 * }
 */
function adaptCloudflareHandler(modulePath: string, verbose = false) {
  const modulePathShort = modulePath.substring(
    modulePath.indexOf("/functions") + "/functions".length
  );
  
  // Skip test files
  if (modulePathShort.includes(".test")) {
    return null;
  }

  return async (request: Request, _match: URLPatternResult) => {
    const routeModule = await import(modulePath);
    
    if (!routeModule.onRequestGet) {
      return null;
    }

    if (verbose) {
      console.log("Route:", modulePathShort);
    }

    // Create minimal CF-style context object
    const ctx = {
      waitUntil: () => {},
      passThroughOnException: () => {},
    };

    // Call the handler with CF-style arguments
    return routeModule.onRequestGet({ request, env, ctx });
  };
}

/**
 * Scans CF path handlers
 * Can reduce amount of scanning by filtering for prefix within fileRootUrl
 * @param fileRootUrl
 * @param prefix
 * @returns
 */
async function cfRoutes(fileRootUrl: string, prefix: string, verbose = false) {
  const fullFileRootUrl = path.join(fileRootUrl, prefix);

  const routes = await discoverRoutes({
    pattern: "/",
    fileRootUrl: fullFileRootUrl,
    pathMapper: freshPathMapper,
    verbose,
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

      const handler = adaptCloudflareHandler(module.toString(), verbose);
      if (handler) {
        if (verbose) {
          console.log("Route:", asSerializablePattern(patternWithPrefix), "->", module.toString());
        }
        handlers.push(byPattern(patternWithPrefix, handler));
      }
    } else {
      throw new Error("Only expect URLPatterns");
    }
  }
  return handlers;
}

const verbose = false;
const cfHandlers = await cfRoutes(import.meta.resolve("../functions"), "/api", verbose);

const serveOpts = { fsRoot: "build" };

export default {
  // Serve any pattern matches in cfHandlers, otherwise serve static files
  fetch: handle(cfHandlers, async (req: Request) => {
    let ret = await serveDir(req, serveOpts);
    if (ret.status === 404) {
      if (verbose) {
        console.log("Got 404 from serveDir, trying with /:", req.url);
      }
      // Try again with /
      const url = new URL(req.url);
      url.pathname = "/";
      ret = await serveDir(new Request(url, req), serveOpts);
    }
    if (verbose) {
      console.log(ret);
    }
    return ret;
  }),
};
