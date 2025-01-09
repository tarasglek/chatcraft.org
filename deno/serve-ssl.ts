import { parseArgs } from "jsr:@std/cli/parse-args";

const helpText = `
Secure HTTPS development server with auto-generated SSL certificates

USAGE:
    deno run --unstable-sloppy-imports --unstable-net --watch -A serve-ssl.ts [OPTIONS]

OPTIONS:
    -h, --help              Show this help message
    --port <NUMBER>         Port to listen on (default: 443)
    --handler <PATH>        Path to handler module (default: "./main.ts")

EXAMPLES:
    # Run with defaults (port 443, main.ts handler)
    deno run --unstable-sloppy-imports --unstable-net --watch -A serve-ssl.ts

    # Run on port 8443 with custom handler
    deno run --unstable-sloppy-imports --unstable-net --watch -A serve-ssl.ts --port 8443 --handler "./custom.ts"
`;

// Parse command line arguments
const args = parseArgs(Deno.args, {
  default: {
    port: 443,
    handler: "./main.ts"
  },
  string: ["handler"],
  number: ["port"],
  boolean: ["help", "h"],
  alias: { h: "help" }
});

// Show help and exit if requested
if (args.help) {
  console.log(helpText);
  Deno.exit(0);
}

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
