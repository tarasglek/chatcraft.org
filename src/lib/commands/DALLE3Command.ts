import { ChatCraftCommand } from "../ChatCraftCommand";
import { ChatCraftChat } from "../ChatCraftChat";
import { ChatCraftHumanMessage } from "../ChatCraftMessage";
import { generateImage } from "../../lib/ai";

export class DALLE3Command extends ChatCraftCommand {
  constructor() {
    super("DALLE3");
  }

  async execute(chat: ChatCraftChat, user: User | undefined, args?: string[]) {
    // return chat.resetMessages();

    if (!(args && args[0])) {
      throw new Error("must include a prompt");
    }
    const prompt = args.join(" ");
    let imageUrls: string[] = [];
    const text = `(DALL·E 3 result of the prompt: ${prompt})`;

    try {
      imageUrls = await generateImage(prompt);
    } catch (error: any) {
      console.error("Failed to generate image:", error);
      throw new Error("Failed to generate image ", error);
    }
    return chat.addMessage(new ChatCraftHumanMessage({ user, text, imageUrls }));
  }
}
