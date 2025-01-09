import { parseArgs } from "@std/cli/parse_args.ts";

// Parse command line arguments
const args = parseArgs(Deno.args, {
  default: {
    port: 443,
    handler: "./main.ts"
  },
  string: ["handler"],
  number: ["port"]
});

// Dynamically import the handler
const handlerModule = await import(args.handler);
const handler = handlerModule.default;
let keys: string[];
do {
  try {
    keys = await Promise.all(["cert", "key"].map((name) => Deno.readTextFile(`${name}.pem`)));
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.log("SSL certificates not found, generating new ones...");
      await new Deno.Command("sh", {
        args: [
          "-c",
          "openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj '/CN=localhost'",
        ],
      }).output();
      continue;
    }
    throw error;
  }
  break;
  // eslint-disable-next-line no-constant-condition
} while (true);

const [cert, key] = keys;
Deno.chdir("..");
Deno.serve({ cert, key, port: args.port, reusePort: true }, handler.fetch);
