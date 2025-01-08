import { serveDir } from "jsr:@std/http/file-server";

/** run `pnpm build --watch`  */
function handleFetch(req: Request): Promise<Response> {
  return serveDir(req, { fsRoot: "build" });
}

export default {
  fetch: handleFetch,
};
