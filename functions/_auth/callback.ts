import { wrap_lastlogin } from "../lastlogin";

interface Env {
  JWT_SECRET: string;
}
// this file exists solely so we can declare a route for lastlogin that we wrap so it can process oauth callback
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  return wrap_lastlogin(env.JWT_SECRET, async (request: Request) => {
    throw new Error("/_auth isn't supposed to get called, it's a dummy endpoint for lastlogin");
  })(request);
};
