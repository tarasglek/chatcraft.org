import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import { VitePWA } from "vite-plugin-pwa";

import { readdirSync } from "node:fs";
import { join } from "node:path";

// For syntax highlighting, we use https://github.com/react-syntax-highlighter/react-syntax-highlighter#async-build
// It includes 180+ languages defined as .js files.  We only want to pre-cache
// some of these in our service worker.  See full list in:
// https://github.com/react-syntax-highlighter/react-syntax-highlighter/tree/master/src/languages/hljs

// bash.js -> assets/bash-*.js

// Language glob patterns to include

// Language glob patterns to exclude

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 2000,
    outDir: "build",
    target: "esnext",
  },
});
