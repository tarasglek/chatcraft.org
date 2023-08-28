import { ChatCraftCommand } from "../ChatCraftCommand";
import { ChatCraftChat } from "../ChatCraftChat";

export class ClearCommand extends ChatCraftCommand {
  constructor() {
    super("clear");
  }

  async execute(chat: ChatCraftChat) {
    return chat.resetMessages();
  }
}
