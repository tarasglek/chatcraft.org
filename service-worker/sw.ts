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
import { clientsClaim } from "workbox-core";
import { onShareTarget } from "./share-target";

declare const self: ServiceWorkerGlobalScope;

const entries = self.__WB_MANIFEST;
// if (import.meta.env.DEV) {
//   entries.push({ url: "/", revision: Math.random().toString() });
// }

precacheAndRoute(entries);

// cleanup old assets
cleanupOutdatedCaches();

// allow only fallback in dev: don't cache anything
let allowlist: undefined | RegExp[];
if (import.meta.env.DEV) {
  allowlist = [/^\/$/];
}
// deny api and server page calls
const denylist: undefined | RegExp[] = [
  // exclude web-share-target
  /^\/web-share-target\//,
];

// // only cache pages and external assets on local build + start or in production
// // if (import.meta.env.PROD) {
// // include webmanifest cache
// registerRoute(
//   ({ request, sameOrigin }) => sameOrigin && request.destination === "manifest",
//   new NetworkFirst({
//     cacheName: "chatcraft-webmanifest",
//     plugins: [
//       new CacheableResponsePlugin({ statuses: [200] }),
//       // we only need a few entries
//       new ExpirationPlugin({ maxEntries: 100 }),
//     ],
//   })
// );
// // }

// allow work offline
registerRoute(new NavigationRoute(createHandlerBoundToURL("/"), { allowlist, denylist }));

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

self.skipWaiting();
clientsClaim();

// share target handler
self.addEventListener("fetch", onShareTarget);
