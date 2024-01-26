import { describe, test, expect } from "vitest";

import { GitHubTransformer } from "./github-transformer";

describe("GitHubTransformer", () => {
  async function testTransform(original: URL, expected: URL) {
    const transformer = new GitHubTransformer();
    const transformed = await transformer.transformUrl(original);
    expect(transformed).toEqual(expected);
  }

  test("Regular URLs with no transformer are unmodified", async () => {
    testTransform(new URL("https://www.google.com"), new URL("https://www.google.com"));
  });

  test("GitHub blob URLs transform to raw", async () => {
    testTransform(
      new URL("https://github.com/tarasglek/chatcraft.org/blob/main/README.md"),
      new URL("https://raw.githubusercontent.com/tarasglek/chatcraft.org/main/README.md")
    );
  });

  test("GitHub gist URLs transform to raw", async () => {
    testTransform(
      new URL("https://gist.github.com/humphd/78605a40dec92bfd60016e31a72e5af2"),
      new URL("https://gist.githubusercontent.com/humphd/78605a40dec92bfd60016e31a72e5af2/raw")
    );
  });

  test("GitHub PR URLs transform to patches", async () => {
    testTransform(
      new URL("https://github.com/tarasglek/chatcraft.org/pull/364"),
      new URL("https://patch-diff.githubusercontent.com/raw/tarasglek/chatcraft.org/pull/364.patch")
    );
  });
});
