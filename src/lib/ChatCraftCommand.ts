import { ChatCraftChat } from "./ChatCraftChat";

export abstract class ChatCraftCommand {
  constructor(public command: string) {}

  // This method should be overridden by subclasses to implement the command
  abstract execute(chat: ChatCraftChat, user: User | undefined, args?: string[]): Promise<void>;

  // Parses the command and arguments from an input string
  static parseCommand(input: string): { command: string; args: string[] } | null {
    const match = input.match(/^\/(\w+)(?:\s+(.*))?$/);
    if (!match) return null;

    const [, command, argString] = match;
    const args = argString ? argString.split(/\s+/) : [];
    return { command, args };
  }

  // Checks if a string is a command.
  static isCommand(input: string): boolean {
    // Check if there's something resembling a command (no non-word characters in the portion after forward slash)
    return /^\/(\w+)(?:\s+(.*))?$/.test(input);
  }
}
