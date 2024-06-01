import { ChatCraftCommand } from "../ChatCraftCommand";
import { ChatCraftChat } from "../ChatCraftChat";
import { ChatCraftHumanMessage } from "../ChatCraftMessage";
import { generateImage, isGenerateImageSupported } from "../../lib/ai";
import { utilizeAlert } from "../../lib/utils";
import type { Dalle3ImageSize } from "../../lib/ai";

export class ImageCommand extends ChatCraftCommand {
  constructor() {
    super("image", {
      helpTitle: "/image [layout-option]<prompt>",
      helpDescription:
        "/image&nbsp;[layout-option]<prompt> | Creates an image using the provided prompt. By default, the image will be square, and you can also change the layout to landscape or portrait by specifying `layout=[l\\|landscape\\|p\\|portrait]`",
    });
  }

  async execute(chat: ChatCraftChat, user: User | undefined, args?: string[]) {
    const { info, loading, closeLoading } = await utilizeAlert();

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
    let size: Dalle3ImageSize = "1024x1024";

    if (isLayout) {
      const layoutValue = first.split("=")[1];
      if (layoutValue == "l" || layoutValue == "landscape") {
        size = "1792x1024";
        layoutType = "landscape";
      } else if (layoutValue == "p" || layoutValue == "portrait") {
        size = "1024x1792";
        layoutType = "portrait";
      } else {
        info({
          title: `Layout ${layoutValue} is not recognized`,
          message: "generating image using the default layout",
        });
      }
    }

    const text = `(DALL·E 3 result ${isLayout ? `[layout ${layoutType}]` : ""} of the prompt: ${prompt})`;
    let imageUrls: string[] = [];

    const alertId = loading({
      title: `Generating image, please wait.`,
    });

    try {
      imageUrls = await generateImage({ prompt, size });
    } catch (error: any) {
      console.error(`Failed to generate image: ${error.message}`);
      throw new Error(`Failed to generate image: ${error.message}`);
    } finally {
      closeLoading(alertId);
    }

    return chat.addMessage(new ChatCraftHumanMessage({ user, text, imageUrls }));
  }
}
