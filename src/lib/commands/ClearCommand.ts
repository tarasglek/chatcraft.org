import { ChatCraftCommand } from "../ChatCraftCommand";
import { ChatCraftChat } from "../ChatCraftChat";

export class ClearCommand extends ChatCraftCommand {
  constructor() {
    super("clear", {
      helpTitle: "/clear",
      helpDescription: "Erases all messages in the current chat.",
    });
  }

  async execute(chat: ChatCraftChat) {
    return chat.resetMessages();
  }
}
