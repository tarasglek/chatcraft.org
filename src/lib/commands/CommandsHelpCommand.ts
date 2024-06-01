import { ChatCraftCommand } from "../ChatCraftCommand";
import { ChatCraftChat } from "../ChatCraftChat";
import { ChatCraftAppMessage } from "../ChatCraftMessage";

export class CommandsHelpCommand extends ChatCraftCommand {
  constructor() {
    super("commands", {
      helpTitle: "/commands",
      helpDescription: "Shows a list of **supported commands** in ChatCraft",
    });
  }

  static getQueriedCommand(messageText: string) {
    // Anything after "app:commands"
    return messageText.split(":")[2];
  }

  //eslint-disable-next-line @typescript-eslint/no-unused-vars
  async execute(chat: ChatCraftChat, user: User | undefined, args?: string[]) {
    return chat.addMessage(new ChatCraftAppMessage({ text: `app:commands:${args?.join(" ")}` }));
  }
}
