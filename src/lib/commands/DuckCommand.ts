import { ChatCraftCommand } from "../ChatCraftCommand";
import { ChatCraftChat } from "../ChatCraftChat";
import { ChatCraftAppMessage } from "../ChatCraftMessage";
import db from "../../lib/db";
import { query } from "../duckdb";
import { jsonToMarkdownTable } from "../utils";

export class DuckCommand extends ChatCraftCommand {
  constructor() {
    super("duck", "/duck", "Do some SQL queries");
  }

  async execute(chat: ChatCraftChat, _user: User | undefined, args?: string[]) {
    const importResult = await db.exportToDuckDB();

    if (!args?.length) {
      return chat.addMessage(
        new ChatCraftAppMessage({ text: jsonToMarkdownTable(importResult.tables) })
      );
    }

    const sql = args.join(" ");
    const queryResult = await query(sql);
    const message = [
      // show query
      "```sql",
      sql,
      "```",
      // show results
      jsonToMarkdownTable(queryResult.toArray()),
    ].join("\n\n");
    return chat.addMessage(new ChatCraftAppMessage({ text: message }));
  }
}
