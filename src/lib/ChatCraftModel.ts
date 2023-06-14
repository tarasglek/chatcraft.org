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
      case "OpenAI/gpt-3.5-turbo":
        return "ChatGPT";
      case "OpenAI/gpt-4":
        return "GPT-4";
      default:
        return `${this.vendor} ${this.model}`;
    }
  }
}
