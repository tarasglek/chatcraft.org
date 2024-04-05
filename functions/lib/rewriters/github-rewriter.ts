import { languageFromFilename } from "../languages";
import { DefaultRewriter } from "./rewriter";

export class GitHubRewriter extends DefaultRewriter {
  async shouldRewrite(url: URL) {
    return url.origin === "https://github.com" || url.origin === "https://gist.github.com";
  }

  async rewriteUrl(url: URL) {
    // Blob URLs - https://github.com/<owner>/<repo>/blob/<branch>/<path>
    if (url.origin === "https://github.com" && /\/(.*)\/blob\/(.*)\/?$/.test(url.pathname)) {
      // https://github.com/<owner>/<repo>/blob/<branch>/<path> ->
      return new URL(
        url.href.replace(
          /^https:\/\/github\.com\/(.*)\/blob\/(.*)\/?$/,
          "https://raw.githubusercontent.com/$1/$2"
        )
      );
    }

    // Gist URLs - https://gist.github.com/<owner>/<gist-id>
    if (url.origin === "https://gist.github.com") {
      // https://gist.github.com/<owner>/<gist-id> -> https://gist.githubusercontent.com/<owner>/<gist-id>/raw
      return new URL(
        url.href.replace(
          /^https:\/\/gist\.github\.com\/([a-zA-Z0-9_-]+)\/([a-f0-9]+)\/?$/,
          "https://gist.githubusercontent.com/$1/$2/raw"
        )
      );
    }

    // PR URLs - https://github.com/<owner>/<repo>/pull/<number>
    if (url.origin === "https://github.com" && /\/(.*)\/pull\/(.*)\/?$/.test(url.pathname)) {
      // TODO: we need to add more logic to deal with a specific comment in a PR via the GitHub API
      // Example: https://github.com/tarasglek/chatcraft.org/pull/370#issuecomment-1916037856
      if (url.hash.startsWith("#issuecomment-")) {
        return url;
      }

      // https://github.com/<owner>/<repo>/pull/<number> -> https://patch-diff.githubusercontent.com/raw/<owner>/<repo>/pull/<number>.patch
      return new URL(
        url.href.replace(
          /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)\/?$/,
          "https://patch-diff.githubusercontent.com/raw/$1/$2/pull/$3.patch"
        )
      );
    }

    return url;
  }

  async rewriteResponse(res: Response) {
    if (!res.ok) {
      return res;
    }

    async function toMarkdownCodeBlock(res: Response, language: string) {
      const text = await res.clone().text();
      const body = "```" + language + "\n" + text + "\n```\n";
      const headers = new Headers(res.headers);
      headers.set("Content-Type", "text/markdown");

      return new Response(body, {
        status: res.status,
        statusText: res.statusText,
        headers,
      });
    }

    const url = new URL(res.url);

    // For Blob URLs, try to figure out the file type by name and highlight
    if (url.origin === "https://raw.githubusercontent.com") {
      const language = languageFromFilename(url.pathname);
      return toMarkdownCodeBlock(res, language);
    }

    // Turn patches into a syntax highlighted diff
    if (url.origin === "https://patch-diff.githubusercontent.com") {
      return toMarkdownCodeBlock(res, "diff");
    }

    // Otherwise pass the response through as-is
    return res;
  }
}
