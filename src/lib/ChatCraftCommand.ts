import { ChatCraftChat } from "./ChatCraftChat";

export abstract class ChatCraftCommand {
  /**
   *
   * @param command Name of the command to be used in format - `/<command-name>`
   * @param helpTitle Title of the command to be displayed in help grid
   * @param helpDescription A brief paragraph explaining how the command works, and any supported options
   */
  constructor(
    public command: string,
    public helpTitle: string,
    public helpDescription: string
  ) {}

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
