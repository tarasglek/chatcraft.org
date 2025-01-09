import { parseArgs } from "jsr:@std/cli/parse-args";

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

try {
  console.log(`Starting server on port ${args.port}...`);
  await Deno.serve({ cert, key, port: args.port, reusePort: true }, handler.fetch);
} catch (error) {
  if (error instanceof Deno.errors.PermissionDenied) {
    const scriptName = Deno.mainModule.split('/').pop() || 'serve-ssl.ts';
    console.error(`\nError: Cannot bind to port ${args.port}. This port requires elevated privileges.`);
    console.error(`Try one of these solutions:`);
    console.error(` - Run with sudo: sudo deno run ... ${scriptName}`);
    console.error(` - Use a port number above 1024: --port 8443\n`);
    Deno.exit(1);
  }
  // Re-throw other errors
  throw error;
}
