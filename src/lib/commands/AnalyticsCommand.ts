import { ChatCraftCommand } from "../ChatCraftCommand";
import { ChatCraftChat } from "../ChatCraftChat";
import { generateAnalytics, visualizeAnalytics } from "../analytics";
import { ChatCraftAppMessage } from "../ChatCraftMessage";

export class AnalyticsCommand extends ChatCraftCommand {
  constructor() {
    super("analytics", "/analytics", "Generate chat analytics.");
  }

  async execute(chat: ChatCraftChat) {
    const analytics = await generateAnalytics();
    chat.addMessage(
      new ChatCraftAppMessage({ text: "```json\n" + JSON.stringify(analytics, null, 2) + "\n```" })
    );
    const visualized = visualizeAnalytics(analytics);
    chat.addMessage(
      new ChatCraftAppMessage({ text: "```json\n" + JSON.stringify(visualized, null) + "\n```" })
    );
  }
}
