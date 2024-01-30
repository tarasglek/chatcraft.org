import { rewriters } from "./rewriters";
import { DefaultRewriter } from "./rewriters/rewriter";

const defaultRewriter = new DefaultRewriter();

/**
 * Apply the first rewriter that matches the request or
 * let the DefaultRewriter handle it if none do.
 */
export async function fetchData(url: URL) {
  for await (const rewriter of rewriters) {
    try {
      if (await rewriter.shouldRewrite(url)) {
        return rewriter.process(url);
      }
    } catch (err) {
      console.error(
        `Rewriter failed: ${rewriter.constructor.name} for ${url.href}: ${err.message}`
      );
    }
  }

  return defaultRewriter.process(url);
}
