import { ChatCraftCommand } from "../ChatCraftCommand";
import { ChatCraftChat } from "../ChatCraftChat";
import { ChatCraftHumanMessage } from "../ChatCraftMessage";
import { CHATCRAFT_TABLES } from "../../lib/db";
import { queryResultToJson } from "../duckdb";
import { query } from "../duckdb-chatcraft";
import { jsonToMarkdownTable } from "../utils";

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
    const data = await query(sql);
    const json = queryResultToJson(data);
    const markdown = jsonToMarkdownTable(json);
    const message = [
      // show query
      "```sql",
      sql,
      "```",
      // show results
      markdown,
    ].join("\n\n");
    return chat.addMessage(new ChatCraftHumanMessage({ text: message }));
  }
}
