import { wrap_lastlogin } from "../lastlogin";
import { byPattern } from "jsr:@http/route/by-pattern";

interface Env {
  JWT_SECRET: string;
}

export const authCallbackHandler = wrap_lastlogin(env.JWT_SECRET, async (request: Request) => {
  throw new Error("/_auth isn't supposed to get called, it's a dummy endpoint for lastlogin");
});

export const authCallbackRoute = byPattern(
  new URLPattern({ pathname: "/_auth/callback" }),
  authCallbackHandler
);

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  return authCallbackHandler(request);
};
