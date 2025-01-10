import { ChatCraftCommand } from "../ChatCraftCommand";
import { ChatCraftChat } from "../ChatCraftChat";
import { ChatCraftAppMessage } from "../ChatCraftMessage";

export class DuckCommand extends ChatCraftCommand {
  constructor() {
    super("duck", "/duck", "Do some SQL queries");
  }

  async execute(chat: ChatCraftChat) {
    const message = [
      "## SQL\n",
      "| Operation | Count | min/avg/max (ms) | Total (ms) |",
      "|-----------|--------|-----------------|------------|",
      // ...results.map((r) => `| ${r.name} | ${r.ops} | ${r.min}/${r.avg}/${r.max} | ${r.total} |`),
    ].join("\n");

    return chat.addMessage(new ChatCraftAppMessage({ text: message }));
  }
}
