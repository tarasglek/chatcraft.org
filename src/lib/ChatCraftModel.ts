export class ChatCraftModel {
  private modelId: string;

  /**
   * @param modelId The model ID in format vendor/model, eg OpenAI/gpt-3.5-turbo-16k
   */
  constructor(modelId: string) {
    if (!modelId.includes("/")) {
      // throw new Error(`Invalid model ID: ${modelId}`);
      modelId = "OpenAI/" + modelId;
    }
    this.modelId = modelId;
  }

  get id(): string {
    return this.modelId;
  }

  get model(): string {
    return this.modelId.split("/")[1];
  }

  get vendor(): string {
    return this.modelId.split("/")[0];
  }

  get prettyModel(): string {
    console.log(this.modelId);
    switch (this.modelId) {
      case "OpenAI/gpt-3.5-turbo-0613":
        return "ChatGPT";
      case "OpenAI/gpt-3.5-turbo":
        return "ChatGPT-0301";
      case "OpenAI/gpt-4":
        return "GPT-4";
      default:
        return `${this.vendor} ${this.model}`;
    }
  }
  static async fetchModels(apiKey: string): Promise<ChatCraftModel[]> {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    const data = await response.json();
    // Hide all pinned models (visual noise) except gpt-3.5-turbo-0613 as that wont be default till June 27 :(
    const ret = data.data
      .filter(
        (model: any) =>
          model.id.includes("gpt") && (model.id == "gpt-3.5-turbo-0613" || !/\d{4}$/.test(model.id))
      )
      .map((model: any) => new ChatCraftModel(`OpenAI/${model.id}`));
    console.log(ret);
    return ret;
  }
}
