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

    const regexLandscape = /@(landscape|1792x1024)/g;
    const regexPortrait = /@(portrait|1024x1792)/g;

    let prompt = args.join(" ");
    let size: dalle3ImageSize = "1024x1024";
    if (regexLandscape.test(prompt)) {
      size = "1792x1024";
    } else if (regexPortrait.test(prompt)) {
      size = "1024x1792";
    }

    prompt = prompt.replace(regexLandscape, "").replace(regexPortrait, "");

    let imageUrls: string[] = [];
    const text = `(DALL·E 3 result of the prompt: ${prompt})`;

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
