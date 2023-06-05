import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "miniflare",
    // Configuration is automatically loaded from `.env`, `package.json` and
    // `wrangler.toml` files by default, but you can pass any additional Miniflare
    // API options here:
    environmentOptions: {
      bindings: {
        CLIENT_ID: "client_id",
        CLIENT_SECRET: "client_secret",
        JWT_SECRET: "jwt_secret",
      },
      kvNamespaces: ["TEST_NAMESPACE"],
    },
  },
});
