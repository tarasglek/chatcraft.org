export class ChatCraftModel {
  id: string;
  vendor: string;

  /**
   * @param model The model's name. Different providers give this in different
   * formats. OpenAI uses `gpt-3.5-turbo` with no vendor info, while OpenRouter.ai
   * uses `openai/gpt-3.5-turbo` (i.e., with vendor/* prefix).
   */
  constructor(model: string) {
    this.id = model;
    const parts = model.split("/");
    // Default to "openai" if we don't get a vendor name
    this.vendor = parts.at(-2) || "openai";
  }

  get name() {
    // Use the model's full id as its name
    return this.id;
  }

  get prettyModel(): string {
    // If we have vendor info in the name, drop it from the "pretty" name to fit better in small UI
    return this.name.replace(`${this.vendor}/`, "");
  }

  get logoUrl() {
    const vendor = this.vendor;

    if (vendor === "openai" && this.name.includes("gpt")) {
      return "/openai-logo.png";
    }

    if (vendor === "anthropic") {
      return "/anthropic-logo.png";
    }

    if (vendor === "microsoft" && this.name.includes("phi")) {
      return "/microsoft-phi-logo.jpg"; // Microsoft's Phi model logo
    }

    if (vendor === "google") {
      return "/google-gemini-logo.png";
    }

    if (vendor === "meta-llama" && this.name.includes("llama")) {
      return "/meta-logo.png";
    }

    if (this.name.includes("mixtral")) {
      return "/mistral-logo.png";
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

  toString() {
    return this.id;
  }

  toJSON() {
    return this.id;
  }
}
