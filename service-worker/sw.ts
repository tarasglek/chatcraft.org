/// <reference lib="WebWorker" />

// declare const self: ServiceWorkerGlobalScope;

self.addEventListener("fetch", async (event) => {
  console.log("Request has been intercepted");
  const url = new URL(event.request.URL);
  // if incoming GET request for registered "action URL", respond to it
  if (event.request.method === "POST" && url.pathname === "/_web-share-target") {
    console.log("Responding");
    await event.respondWith(async () => {
      const formData = await event.request.formData();
      const title = formData.get("title");
      console.log(title);
    });
  }
});
