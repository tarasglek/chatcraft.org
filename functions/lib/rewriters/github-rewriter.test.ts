import { describe, test, expect } from "vitest";

import { GitHubRewriter } from "./github-rewriter";

describe("GitHubRewriter", () => {
  async function testRewriter(original: URL, expected: URL) {
    const rewriter = new GitHubRewriter();
    const url = await rewriter.rewriteUrl(original);
    expect(url).toEqual(expected);
  }

  test("Regular URLs with no rewriter are unmodified", async () => {
    testRewriter(new URL("https://www.google.com"), new URL("https://www.google.com"));
  });

  test("GitHub blob URLs are rewritten to raw", async () => {
    testRewriter(
      new URL("https://github.com/tarasglek/chatcraft.org/blob/main/README.md"),
      new URL("https://raw.githubusercontent.com/tarasglek/chatcraft.org/main/README.md")
    );
  });

  test("GitHub gist URLs are rewritten to raw", async () => {
    testRewriter(
      new URL("https://gist.github.com/humphd/78605a40dec92bfd60016e31a72e5af2"),
      new URL("https://gist.githubusercontent.com/humphd/78605a40dec92bfd60016e31a72e5af2/raw")
    );
  });

  test("GitHub PR URLs are rewritten to patch diffs", async () => {
    testRewriter(
      new URL("https://github.com/tarasglek/chatcraft.org/pull/364"),
      new URL("https://patch-diff.githubusercontent.com/raw/tarasglek/chatcraft.org/pull/364.patch")
    );
  });
});
