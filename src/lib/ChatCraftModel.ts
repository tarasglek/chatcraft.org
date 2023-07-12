export class ChatCraftModel {
  private modelId: string;
  private owner: string;

  /**
   * @param model The model. If the format is `vendor/model` (eg `OpenAI/gpt-3.5-turbo-16k`)
   * then the vendor is extracted from the ID
   * @param vendor Optional vendor name. Used if model name does not have explicit `vendor/*`
   */
  constructor(model: string, vendor?: string) {
    this.modelId = model;
    if (vendor) {
      this.owner = vendor;
    } else {
      this.owner = "";
    }
  }

  get logoUrl() {
    const owner = this.owner.toLowerCase();
    const model = this.modelId.toLowerCase();

    if (owner === "openai" || model.startsWith("openai/")) {
      return "/openai-logo.png";
    }

    if (owner === "anthropic" || model.startsWith("anthropic/")) {
      return "/anthropic-logo.png";
    }

    // Google has Palm and Bard, but only currently have access to Palm
    if (model.startsWith("google/palm")) {
      return "/palm-logo.png";
    }

    // Use the Hugging Face logo, since it's hosted there
    // https://huggingface.co/tiiuae/falcon-40b
    if (model.startsWith("tiiuae/")) {
      return "/hugging-face-logo.png";
    }

    // If we don't know, use the OpenAI logo as a fallback
    return "/openai-logo.png";
  }

  get id() {
    return this.modelId;
  }

  get vendor() {
    return this.owner;
  }

  get prettyModel(): string {
    let modelName = this.modelId;
    if (modelName.includes("/")) {
      modelName = modelName.split("/")[1];
    }

    if (modelName.startsWith("gpt-3.5-turbo")) {
      return modelName.replace("gpt-3.5-turbo", "chat-gpt");
    }

    return modelName;
  }

  toString() {
    return this.modelId;
  }

  toJSON() {
    return this.modelId;
  }
}
