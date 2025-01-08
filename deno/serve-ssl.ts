import handler from "./main.ts";
// deno run --unstable-sloppy-imports --unstable-net --watch -A serve-ssl.ts
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
} while (true);

const [cert, key] = keys;
Deno.chdir("..");
Deno.serve({ cert, key, port: 4443, reusePort: true }, handler.fetch);
