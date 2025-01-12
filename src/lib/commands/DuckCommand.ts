import { ChatCraftCommand } from "../ChatCraftCommand";
import { ChatCraftChat } from "../ChatCraftChat";
import { ChatCraftAppMessage } from "../ChatCraftMessage";
import db from "../../lib/db";
import { query, queryResultToJson } from "../duckdb";
import { jsonToMarkdownTable } from "../utils";

export class DuckCommand extends ChatCraftCommand {
  constructor() {
    super("duck", "/duck", "Do some SQL queries");
  }

  async execute(chat: ChatCraftChat, _user: User | undefined, args?: string[]) {
    await db.exportToDuckDB();

    if (!args?.length) {
      // Get a list of all tables and describe each one
      const message: string[] = ["## DuckDB Tables"];
      const result = await query("SHOW TABLES");
      const tableNames = queryResultToJson(result);

      await Promise.all(
        tableNames.map(async ({ name }) => {
          const result = await query(`DESCRIBE ${name}`);
          message.push(`### ${name}`, jsonToMarkdownTable(queryResultToJson(result)));
        })
      );

      return chat.addMessage(new ChatCraftAppMessage({ text: message.join("\n\n") }));
    }

    const sql = args.join(" ");
    const queryResult = await query(sql);
    const message = [
      // show query
      "```sql",
      sql,
      "```",
      // show results
      jsonToMarkdownTable(queryResultToJson(queryResult)),
    ].join("\n\n");
    return chat.addMessage(new ChatCraftAppMessage({ text: message }));
  }
}
