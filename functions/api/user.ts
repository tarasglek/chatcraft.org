import { get_secrets } from "../secrets";

interface Env {
  JWT_SECRET: string;
}

// GET https://chatcraft.org/api/proxy?url=<encoded url...>
// Must include JWT in cookie, and user must match token owner
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  console.error("user-info.ts onRequestGet");
  // get_secrets("production", env.JWT_SECRET)
  return new Response(JSON.stringify({ hello: "world" }), {
    headers: { "content-type": "application/json" },
  });
};
