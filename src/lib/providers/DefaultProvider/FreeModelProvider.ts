import { ChatCraftModel } from "../../ChatCraftModel";
import { ChatCraftProvider, FREEMODELPROVIDER_API_URL } from "../../ChatCraftProvider";

export class FreeModelProvider extends ChatCraftProvider {
  constructor() {
    super(FREEMODELPROVIDER_API_URL, "mock_key");
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

  defaultModelForProvider() {
    return new ChatCraftModel("undi95/toppy-m-7b:free");
  }
}
