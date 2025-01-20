import { decryptSops } from "sops-age";
import production_json from "production.json";

export async function get_secrets(environment: string, AGE_SECRET_KEY: string) {
  switch (environment) {
    case "production":
      return await decryptSops(production_json, {
        secretKey: AGE_SECRET_KEY,
      });
  }
  throw new Error("Unknown environmentp");
}
