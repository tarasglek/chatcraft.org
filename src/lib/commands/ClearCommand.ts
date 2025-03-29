import { ChatCraftCommand } from "../ChatCraftCommand";
import { ChatCraftChat } from "../ChatCraftChat";
import { isWindows } from "../utils";

export class ClearCommand extends ChatCraftCommand {
  constructor() {
    const keyboardShortcutDescription = `CTRL+l${!ClearCommand.isShortcutEnabled() ? " (Unavailable in Windows)" : ""}`;
    super(
      "clear",
      "/clear",
      "Erases all messages in the current chat.",
      keyboardShortcutDescription
    );
  }

  async execute(chat: ChatCraftChat) {
    if (ClearCommand.isShortcutEnabled()) {
      return chat.resetMessages();
    }
  }

  static isShortcutEnabled() {
    return !isWindows();
  }
}
