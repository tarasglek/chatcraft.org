import { ChatCraftCommand } from "../ChatCraftCommand";
import { ChatCraftHumanMessage } from "../ChatCraftMessage";

export class StatsCommand extends ChatCraftCommand {
  constructor() {
    super("new", "/new", "Creates a new chat.");
  }

  async execute(chat: ChatCraftChat, user: User | undefined, args?: string[]) {
    const text = "perf stats go here";
    return chat.addMessage(new ChatCraftHumanMessage({ user, text }));
  }
}
