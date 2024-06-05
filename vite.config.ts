import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";

import { readdirSync } from "node:fs";
import { join } from "node:path";

// For syntax highlighting, we use https://github.com/react-syntax-highlighter/react-syntax-highlighter#async-build
// It includes 180+ languages defined as .js files.  We only want to pre-cache
// some of these in our service worker.  See full list in:
// https://github.com/react-syntax-highlighter/react-syntax-highlighter/tree/master/src/languages/hljs
const languagesDir = "node_modules/react-syntax-highlighter/dist/esm/languages/hljs";
const includedLanguages = ["css.js", "javascript.js", "typescript.js", "python.js"];

// bash.js -> assets/bash-*.js
const filenameToGlob = (prefix: string, filename: string) => {
  const [basename, extname] = filename.split(".");
  return join(prefix, `${basename}-*.${extname}`);
};

// Language glob patterns to include
function buildLanguageGlobPatterns(prefix: string) {
  return includedLanguages.map((filename) => filenameToGlob(prefix, filename));
}

// Language glob patterns to exclude
function buildLanguageIgnoreGlobPatterns(prefix: string) {
  const languageFiles = readdirSync(languagesDir);

  // Turn ['bash.js', ...] into ['assets/bash-*.js', ...]
  // filtering out the languages we want to bundle.
  return languageFiles
    .filter((filename) => !includedLanguages.includes(filename))
    .map((filename) => filenameToGlob(prefix, filename));
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // See generated stats.html file for visualization of bundle sizes
    visualizer(),
    react(),
    wasm(),
    // https://vite-pwa-org.netlify.app/guide/
    VitePWA({
      registerType: "autoUpdate",
      // srcDir: "./service-worker",
      // filename: "sw.ts",
      // scope: "/",
      strategies: "injectManifest",
      injectRegister: false,
      manifest: {
        name: "ChatCraft.org",
        short_name: "ChatCraft",
        icons: [
          { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
          {
            src: "/android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
        start_url: "index.html",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        share_target: {
          action: "/web-share-target",
          method: "POST",
          enctype: "multipart/form-data",
          params: {
            title: "title",
            text: "text",
            url: "url",
          },
        },
      },
      workbox: {
        globIgnores: [
          // Ignore all languages we don't explicitly include as part of `includedLanguages`
          ...buildLanguageIgnoreGlobPatterns("**/assets/"),
          // Ignore large tiktoken assets (load them at runtime if needed)
          "**/assets/tiktoken-*.js",
          "**/assets/cl100k_base*.js",
        ],
        globPatterns: [
          "*.{ico,png}",
          "**/assets/*.{js,json,css,ico,png,svg}",
          ...buildLanguageGlobPatterns("**/assets/"),
        ],
        // Don't fallback on document based (e.g. `/some-page`) requests
        // Even though this says `null` by default, I had to set this specifically to `null` to make it work
        navigateFallback: null,
        skipWaiting: true,
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 2200,
    outDir: "build",
    target: "esnext",
  },
});
