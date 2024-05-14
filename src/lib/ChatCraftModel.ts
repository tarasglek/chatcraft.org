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

    if (vendor === "openai" && this.name.includes("gpt")) {
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

    return undefined;
  }

  // Simple hash from name's characters to a 6-digit hexadecimal color code
  get logoBg(): string {
    let hash = 0;
    for (let i = 0; i < this.name.length; i++) {
      hash = this.name.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = "#";
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xff;
      color += ("00" + value.toString(16)).substr(-2);
    }
    return color;
  }

  /**
   * Not all models (or vendors) support function calling. Currently
   * OpenAI GPT models do, with gpt-3.5-turbo-0613 and gpt-4-0613 being
   * the best models to use for this task, see:
   * https://platform.openai.com/docs/guides/gpt/function-calling
   */
  get supportsFunctionCalling() {
    const { name } = this;
    // The OpenAI vision models can't do function calling
    return (
      !this.name.includes("vision") &&
      (name.startsWith("gpt-3.5-turbo") || name.startsWith("gpt-4"))
    );
  }

  get supportsImages() {
    return (
      this.name.includes("vision") ||
      this.name.startsWith("gpt-4-turbo") ||
      this.name.startsWith("gpt-4o")
    );
  }

  get prettyModel(): string {
    return this.name;
  }

  toString() {
    return this.id;
  }

  toJSON() {
    return this.id;
  }
}
