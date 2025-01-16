import { ChatCraftCommand } from "../ChatCraftCommand";
import { ChatCraftChat } from "../ChatCraftChat";
import { ChatCraftAppMessage } from "../ChatCraftMessage";

export class AnalyticsCommand extends ChatCraftCommand {
  constructor() {
    super("analytics", "/analytics", "Generate chat analytics.");
  }

  async execute(chat: ChatCraftChat) {
    chat.addMessage(new ChatCraftAppMessage({ text: "app:analytics" }));
  }
}
