import { ChatCraftCommand } from "../ChatCraftCommand";
import { ChatCraftChat } from "../ChatCraftChat";
import { ChatCraftHumanMessage } from "../ChatCraftMessage";
import { generateImage, isGenerateImageSupported } from "../../lib/ai";

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
    const prompt = args.join(" ");
    let imageUrls: string[] = [];
    const text = `(DALL·E 3 result of the prompt: ${prompt})`;

    try {
      imageUrls = await generateImage(prompt);
    } catch (error: any) {
      console.error(`Failed to generate image: ${error.message}`);
      throw new Error(`Failed to generate image: ${error.message}`);
    }
    return chat.addMessage(new ChatCraftHumanMessage({ user, text, imageUrls }));
  }
}
