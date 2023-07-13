export class ChatCraftModel {
  id: string;
  vendor: string;
  name: string;

  /**
   * @param model The model's name. Different providers give this in different
   * formats. OpenAI uses `gpt-3.5-turbo` with no vendor info, while OpenRouter.ai
   * uses `openai/gpt-3.5-turbo` (i.e., with vendor/* prefix).
   */
  constructor(model: string) {
    this.id = model;
    const parts = model.split("/");
    // Default to "openai" if we don't get a vendor name
    this.vendor = parts.length > 1 ? parts[0] : "openai";
    // If we get a vendor, use the second part, otherwise the whole thing is the model name
    this.name = parts.length > 1 ? parts[1] : parts[0];
  }

  get logoUrl() {
    const vendor = this.vendor;

    if (vendor === "openai") {
      return "/openai-logo.png";
    }

    if (vendor === "anthropic") {
      return "/anthropic-logo.png";
    }

    if (vendor === "google") {
      return "/palm-logo.png";
    }

    // Use the Hugging Face logo, since it's hosted there
    // https://huggingface.co/tiiuae/falcon-40b
    if (vendor === "tiiuae") {
      return "/hugging-face-logo.png";
    }

    // If we don't know, use the OpenAI logo as a fallback
    return "/openai-logo.png";
  }

  get prettyModel(): string {
    if (this.name.startsWith("gpt-3.5-turbo")) {
      return this.name.replace("gpt-3.5-turbo", "chat-gpt");
    }

    return this.name;
  }

  toString() {
    return this.id;
  }

  toJSON() {
    return this.id;
  }
}
