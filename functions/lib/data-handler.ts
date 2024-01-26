import { transformers } from "./transformers";
import { DefaultTransformer } from "./transformers/transformer";

const defaultTransformer = new DefaultTransformer();

/**
 * Apply the first transformer that matches the request or
 * let the DefaultTransformer handle it if none do.
 */
export async function fetchData(url: URL) {
  for await (const transformer of transformers) {
    try {
      if (await transformer.shouldTransform(url)) {
        return transformer.process(url);
      }
    } catch (err) {
      console.error(
        `Transformer failed: ${transformer.constructor.name} for ${url.href}: ${err.message}`
      );
    }
  }

  return defaultTransformer.process(url);
}
