import { ChatCraftCommand } from "../ChatCraftCommand";
import { ChatCraftChat } from "../ChatCraftChat";

export class ClearCommand extends ChatCraftCommand {
  constructor() {
    super("clear", "/clear", "Erases all messages in the current chat.", "CTRL+l");
  }

  async execute(chat: ChatCraftChat) {
    return chat.resetMessages();
  }
}
