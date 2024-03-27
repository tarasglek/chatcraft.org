import {
  ChatCraftProvider,
  FREEMODELPROVIDER_API_URL,
  FREEMODELPROVIDER_NAME,
} from "../../ChatCraftProvider";

const FREEMODELPROVIDER_DEFAULT_MODEL = "undi95/toppy-m-7b:free";

export class FreeModelProvider extends ChatCraftProvider {
  constructor() {
    super(
      FREEMODELPROVIDER_NAME,
      FREEMODELPROVIDER_API_URL,
      FREEMODELPROVIDER_DEFAULT_MODEL,
      "mock_key"
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async queryModels(key: string) {
    const res = await fetch(`${FREEMODELPROVIDER_API_URL}/models`, {
      method: "GET",
    });

    if (!res.ok) {
      throw new Error(`${res.status} ${await res.text()}`);
    }

    try {
      const result = await res.json();
      return result.data.map((model: { id: string }) => model.id) as string[];
    } catch (err: any) {
      throw new Error(`error querying models API: ${err.message}`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async validateApiKey(key: string) {
    return true;
  }
}
