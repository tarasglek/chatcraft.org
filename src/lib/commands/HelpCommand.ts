import { ChatCraftCommand } from "../ChatCraftCommand";
import { ChatCraftChat } from "../ChatCraftChat";
import { ChatCraftAppMessage } from "../ChatCraftMessage";

export class HelpCommand extends ChatCraftCommand {
  constructor() {
    super("help", "/help", "Shows this help message.");
  }

  async execute(chat: ChatCraftChat) {
    return chat.addMessage(new ChatCraftAppMessage({ text: "app:help" }));
  }
}
