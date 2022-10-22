
const reScreenshot = /\/screenshot\/(.*).png$/

/** hello world cloudflare function in typescript */
export async function onRequest(context: {
  request: Request;
  env: { [key: string]: string };
  params: { [key: string]: string };
  waitUntil: (promise: Promise<any>) => void;
  next: () => Promise<void>;
  data: { [key: string]: any };
}) {
  // Contents of context object
  const {
    request, // same as existing Worker API
    env, // same as existing Worker API
    params, // if filename includes [id] or [[path]]
    waitUntil, // same as ctx.waitUntil in existing Worker API
    next, // used for middleware or to fetch assets
    data, // arbitrary space for passing data between middlewares
  } = context;

  let match = reScreenshot.exec(request.url)
  let response = `Hello, world!${match} ${request.url} ${request.method} ${JSON.stringify(data)}`
  if (match) {
    let uuid = match[1]
    // response = path
    let anon_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5saW5iYWxseGFiZGRxdm1maXFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NjU1OTQ2MTksImV4cCI6MTk4MTE3MDYxOX0.HdIauGMRvfBSxJhp5SZnfgNDH1vM1SlIk4RuzkNbiTo'
    let res = await fetch('https://nlinballxabddqvmfiqc.supabase.co/rest/v1/shared?select=screenshot&uuid=eq.'+uuid, {
      headers: {
          apikey:anon_key,
          authorization: `Bearer ${anon_key}`
        }
    })
    let json = await res.json()
    res = null
    var binary = atob(json[0].screenshot.split(',')[1]);
    json = null
    const uint8Array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        uint8Array[i] = binary.charCodeAt(i);
    }
    const arrayBuffer = uint8Array.buffer;
    console.log(request.headers)
    return new Response(arrayBuffer, {headers: {'Content-Type': 'image/png'}});
  } else {
    return new Response(""+match);
  }
}