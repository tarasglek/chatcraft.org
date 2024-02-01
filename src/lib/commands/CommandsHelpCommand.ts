import { ChatCraftCommand } from "../ChatCraftCommand";
import { ChatCraftChat } from "../ChatCraftChat";
import { ChatCraftAppMessage } from "../ChatCraftMessage";

export class CommandsHelpCommand extends ChatCraftCommand {
  constructor() {
    super("commands");
  }

  async execute(chat: ChatCraftChat) {
    return chat.addMessage(new ChatCraftAppMessage({ text: "app:commands" }));
  }
}
