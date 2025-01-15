import { ChatCraftCommand } from "../ChatCraftCommand";
import { ChatCraftChat } from "../ChatCraftChat";
import { ChatCraftHumanMessage } from "../ChatCraftMessage";
import { CHATCRAFT_TABLES } from "../../lib/db";
import { queryToMarkdown } from "../duckdb-chatcraft";

export class DuckCommand extends ChatCraftCommand {
  constructor() {
    super("duck", "/duck", "Do some SQL queries");
  }

  async execute(chat: ChatCraftChat, _user: User | undefined, args?: string[]) {
    if (!args?.length) {
      return chat.addMessage(
        new ChatCraftHumanMessage({
          text:
            `Available DuckDB Tables - ` +
            `${CHATCRAFT_TABLES.map((t) => `chatcraft.${t}`).join(", ")}\n\nTry \`/duck describe chatcraft.chats\``,
        })
      );
    }

    const sql = args.join(" ");
    const markdown = await queryToMarkdown(sql);
    const message = [
      // show query
      "```sql",
      sql,
      "```",
      // show results
      markdown,
    ].join("\n");
    return chat.addMessage(new ChatCraftHumanMessage({ text: message }));
  }
}
