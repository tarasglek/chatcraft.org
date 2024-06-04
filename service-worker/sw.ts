/// <reference lib="WebWorker" />
/// <reference types="vite/client" />

import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { NetworkFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { onShareTarget } from "./share-target";

declare const self: ServiceWorkerGlobalScope;

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

const entries = self.__WB_MANIFEST;
// if (import.meta.env.DEV) {
//   entries.push({ url: "/", revision: Math.random().toString() });
// }

precacheAndRoute(entries);

// cleanup old assets
cleanupOutdatedCaches();

// allow only fallback in dev: don't cache anything
let allowlist: undefined | RegExp[];
// if (import.meta.env.DEV) {
//   allowlist = [/^\/$/];
// }
// deny api and server page calls
const denylist: undefined | RegExp[] = [
  /^\/api\//,
  /^\/login\//,
  /^\/oauth\//,
  /^\/signin\//,
  /^\/web-share-target\//,
  // exclude emoji: has its own cache
  /^\/emojis\//,
  // exclude sw: if the user navigates to it, fallback to index.html
  /^\/sw.js$/,
  // exclude webmanifest: has its own cache
  /^\/manifest-(.*).webmanifest$/,
];

// only cache pages and external assets on local build + start or in production
// if (import.meta.env.PROD) {
// include webmanifest cache
registerRoute(
  ({ request, sameOrigin }) => sameOrigin && request.destination === "manifest",
  new NetworkFirst({
    cacheName: "chatcraft-webmanifest",
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      // we only need a few entries
      new ExpirationPlugin({ maxEntries: 100 }),
    ],
  })
);
// }

// allow work offline
registerRoute(new NavigationRoute(createHandlerBoundToURL("/"), { allowlist, denylist }));

// share target handler
self.addEventListener("fetch", onShareTarget);

// self.addEventListener("fetch", async (event) => {
//   console.log("Request has been intercepted");
//   const url = new URL(event.request.URL);
//   // if incoming GET request for registered "action URL", respond to it
//   if (event.request.method === "POST" && url.pathname === "/web-share-target") {
//     console.log("Responding");
//     await event.respondWith(async () => {
//       const formData = await event.request.formData();
//       const title = formData.get("title");
//       console.log(title);
//     });
//   }
// });
