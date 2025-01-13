import { ChatCraftCommand } from "../ChatCraftCommand";
import { ChatCraftChat } from "../ChatCraftChat";
import { ChatCraftHumanMessage } from "../ChatCraftMessage";
import db from "../../lib/db";
import { query, queryResultToJson } from "../duckdb";
import { jsonToMarkdownTable } from "../utils";

export class DuckCommand extends ChatCraftCommand {
  constructor() {
    super("duck", "/duck", "Do some SQL queries");
  }

  async execute(chat: ChatCraftChat, _user: User | undefined, args?: string[]) {
    const exportResult = await db.exportToDuckDB();

    if (!args?.length) {
      // Get a list of all tables and describe each one
      const message: string[] = ["## DuckDB Tables"];
      const result = await query("SHOW TABLES");
      const tableNames = queryResultToJson(result);

      await Promise.all(
        tableNames.map(async ({ name }) => {
          const rowCount = exportResult.tables.find((table) => table.name === name)?.rowCount || 0;
          const result = await query(`DESCRIBE ${name}`);
          message.push(
            `### ${name} (${rowCount} rows)`,
            jsonToMarkdownTable(queryResultToJson(result))
          );
        })
      );

      return chat.addMessage(new ChatCraftHumanMessage({ text: message.join("\n\n") }));
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
    return chat.addMessage(new ChatCraftHumanMessage({ text: message }));
  }
}
