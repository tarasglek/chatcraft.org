export class ChatCraftModel {
  private modelId: string;
  private owner: string;

  /**
   * @param model The model. If the format is `vendor/model` (eg `OpenAI/gpt-3.5-turbo-16k`)
   * then the vendor is extracted from the ID
   * @param vendor Optional vendor name. Used if model name does not have explicit `vendor/*`
   */
  constructor(model: string, vendor?: "OpenAI") {
    if (model && vendor) {
      this.modelId = model;
      this.owner = vendor;
    } else if (model.includes("/") && !vendor) {
      const [v, m] = model.split("/");
      this.modelId = m;
      this.owner = v;
    } else {
      this.modelId = model;
      // Assume OpenAI if we don't get any vendor info
      this.owner = "OpenAI";
    }
  }

  get id() {
    return this.modelId;
  }

  get vendor() {
    return this.owner;
  }

  get prettyModel(): string {
    if (this.modelId.startsWith("gpt-3.5-turbo")) {
      return this.modelId.replace("gpt-3.5-turbo", "ChatGPT");
    }

    if (this.modelId.startsWith("gpt-4")) {
      return this.modelId.replace("gpt-4", "GPT-4");
    }

    return `${this.owner} ${this.modelId}`;
  }

  toString() {
    return `${this.owner}/${this.modelId}`;
  }

  toJSON() {
    return `${this.owner}/${this.modelId}`;
  }
}
