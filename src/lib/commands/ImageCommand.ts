import { ChatCraftCommand } from "../ChatCraftCommand";
import { ChatCraftChat } from "../ChatCraftChat";
import { ChatCraftHumanMessage } from "../ChatCraftMessage";
import { generateImage, isGenerateImageSupported } from "../../lib/ai";
import { utilizeAlert } from "../../lib/utils";
import type { dalle3ImageSize } from "../../lib/ai";

export class ImageCommand extends ChatCraftCommand {
  constructor() {
    super("image");
  }

  async execute(chat: ChatCraftChat, user: User | undefined, args?: string[]) {
    const { loading, closeLoading } = await utilizeAlert();

    if (!(await isGenerateImageSupported())) {
      throw new Error("Failed to generate image, no image generation models available");
    }
    if (!(args && args[0])) {
      throw new Error("must include a prompt");
    }
    const prompt = args.join(" ");
    let imageUrls: string[] = [];
    const text = `(DALL·E 3 result of the prompt: ${prompt})`;

    const alertId = loading({
      title: `Generating image, please wait.`,
    });

    try {
      //TODO, refactor to object calling like generateImage(prompt, {size});
      imageUrls = await generateImage(prompt, 1, size);
    } catch (error: any) {
      console.error(`Failed to generate image: ${error.message}`);
      throw new Error(`Failed to generate image: ${error.message}`);
    }

    closeLoading(alertId);
    return chat.addMessage(new ChatCraftHumanMessage({ user, text, imageUrls }));
  }
}
