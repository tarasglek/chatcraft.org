// NOTE: import commands/index.ts to get all commands registered and the registry itself

import { ChatCraftChat } from "./ChatCraftChat";
import { ChatCraftCommand } from "./ChatCraftCommand";

export class ChatCraftCommandRegistry {
  private static commands: Map<string, ChatCraftCommand> = new Map();

  static registerCommand(command: ChatCraftCommand): void {
    this.commands.set(command.command, command);
  }

  static getCommand(input: string) {
    const parsed = ChatCraftCommand.parseCommand(input);
    if (!parsed) {
      return null;
    }

    const command = this.commands.get(parsed.command);
    if (!command) {
      return null;
    }

    return (chat: ChatCraftChat, user: User | undefined) =>
      command.execute(chat, user, parsed.args);
  }

  static isCommand(input: string): boolean {
    return ChatCraftCommand.isCommand(input);
  }
}
