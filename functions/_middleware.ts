// Attach multiple handlers
type Next = (input?: Request | string, init?: RequestInit) => Promise<Response>

export const onRequest = [
  async ({ request, next, functionPath }) => {
    try {
      // Call the next handler in the stack
      // console.log(next)
      let n = next as Next
      // console.log(request.url, functionPath)
      const url = new URL(request.url)
      let debug = url.pathname == '/'
      if (debug) {
        console.log(request.headers)
      }
      const response = await n(request, {headers: request.headers});
      const responseText = await response.text();
      //~> "Hello from next base middleware"
      // return new Response(responseText + ` from middleware ${JSON.stringify(response.headers)}`);
      
      if (debug)
        console.log(url.pathname, functionPath, request.url, response.status, response.statusText, response.headers)

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