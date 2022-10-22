// Attach multiple handlers
type Next = (input?: Request | string, init?: RequestInit) => Promise<Response>

export const onRequest = [
  async ({ request, next, functionPath }) => {
    try {
      // Call the next handler in the stack
      // console.log(next)
      let _next = next as Next
      let _request = request as Request
      // console.log(request.url, functionPath)
      const url = new URL(_request.url)
      let rewrite = url.pathname == '/'
      if (rewrite) {
        request.headers.delete('if-none-match')
        console.log(request.headers)
      }
      const response = await _next(_request, {headers: _request.headers});
      let responseText = await response.text();
      //~> "Hello from next base middleware"
      // return new Response(responseText + ` from middleware ${JSON.stringify(response.headers)}`);
      
      if (rewrite) {
        responseText = responseText.replace('https://private.overthinker.dev/screenshot.png', 'taras was here')
        console.log(url.pathname, functionPath, request.url, response.status, response.statusText, response.headers)
      }
      if (response.status != 200) {
        return new Response(undefined, response);
      }
      return new Response(responseText, response);
    } catch (thrown) {
      console.log(request.url, thrown)
      return new Response(thrown + thrown.stack);

      return new Response(`Error ${thrown}`, {
        status: 500,
        statusText: "Internal Server Error",
      });
    }
  },
 
];