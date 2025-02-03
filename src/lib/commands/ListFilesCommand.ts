import { ChatCraftCommand } from "../ChatCraftCommand";
import { ChatCraftChat } from "../ChatCraftChat";
import { ChatCraftHumanMessage } from "../ChatCraftMessage";
import { formatNumber } from "../utils";

export class ListFilesCommand extends ChatCraftCommand {
  constructor() {
    super("ls", "/ls", "List files attached to chat");
  }

  async execute(chat: ChatCraftChat) {
    let markdown = "";

    const files = chat.files();
    if (!files.length) {
      markdown += "No files.";
    } else {
      markdown += `Found ${files.length} file(s):\n\n`;

      for (const file of files) {
        const { id, name, type, size } = file;
        markdown += [
          `- \`${name}\``,
          `  - ID: \`${id}\``,
          `  - Type: \`${type}\``,
          `  - Size: \`${formatNumber(size)}\``,
          "",
        ].join("\n");
      }
    }

    return chat.addMessage(new ChatCraftHumanMessage({ text: markdown }));
  }
}
