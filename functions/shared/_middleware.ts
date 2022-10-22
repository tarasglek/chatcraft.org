// Attach multiple handlers
type Next = (input?: Request | string, init?: RequestInit) => Promise<Response>

const reShare = /^\/shared\/(.*)$/
export const onRequest = [
  async ({ request, next }) => {
    try {
      let _next = next as Next
      let _request = request as Request
      const response = await _next(_request, {headers: _request.headers});
      let responseText = await response.text();

      // Only rewrite body if it's not cached
      if (response.status == 200) {
        const url = new URL(_request.url)
        let match = reShare.exec(url.pathname)
        if (match) {
          let path = match[1]
          let screenshot = url.protocol + "//" + url.host + '/screenshot/' + path + '.png'
          console.log('screenshot', screenshot)
          console.log(request.headers)
          responseText = responseText.replace(new RegExp('https://private.overthinker.dev/screenshot.png', 'g'), screenshot)
        }
      }
      // Cloudflare gets upset when specify 304 and include a body, even if it's ""
      return new Response(response.status == 200 ? responseText : undefined, response);
    } catch (thrown) {
      return new Response(`Error serving ${request.url}: ${thrown}`, {
        status: 500,
        statusText: "Internal Server Error",
      });
    }
  },
 
];