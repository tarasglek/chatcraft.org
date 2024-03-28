import { ChatCraftCommand } from "../ChatCraftCommand";
import { ChatCraftChat } from "../ChatCraftChat";
import { ChatCraftHumanMessage } from "../ChatCraftMessage";
import { generateImage, isGenerateImageSupported } from "../../lib/ai";
import type { dalle3ImageSize } from "../../lib/ai";

export class ImageCommand extends ChatCraftCommand {
  constructor() {
    super("image");
  }

  async execute(chat: ChatCraftChat, user: User | undefined, args?: string[]) {
    if (!(await isGenerateImageSupported())) {
      throw new Error("Failed to generate image, no image generation models available");
    }
    if (!(args && args[0])) {
      throw new Error("must include a prompt");
    }

    const [first, ...rest] = args;
    const isLayout = first.startsWith("layout=");
    const prompt = isLayout ? rest.join(" ") : args.join(" ");
    let layoutType = "square";
    let size: dalle3ImageSize = "1024x1024";
    if (isLayout) {
      const layoutValue = first.split("=")[1];
      if (layoutValue == "l" || layoutValue == "landscape") {
        size = "1792x1024";
        layoutType = "landscape";
      } else if (layoutValue == "p" || layoutValue == "portrait") {
        size = "1024x1792";
        layoutType = "portrait";
      }
    }

    const text = `(DALL·E 3 result ${isLayout ? `[layout ${layoutType}]` : ""} of the prompt: ${prompt})`;
    let imageUrls: string[] = [];

    try {
      //TODO, refactor to object calling like generateImage(prompt, {size});
      imageUrls = await generateImage(prompt, 1, size);
    } catch (error: any) {
      console.error(`Failed to generate image: ${error.message}`);
      throw new Error(`Failed to generate image: ${error.message}`);
    }
    return chat.addMessage(new ChatCraftHumanMessage({ user, text, imageUrls }));
  }
}
