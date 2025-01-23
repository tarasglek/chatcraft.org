import { ChatCraftCommand } from "../ChatCraftCommand";
import { ChatCraftChat } from "../ChatCraftChat";
import { ChatCraftHumanMessage } from "../ChatCraftMessage";
import { getFiles, getTables, queryToMarkdown } from "../duckdb-chatcraft";

export class DuckCommand extends ChatCraftCommand {
  constructor() {
    super("duck", "/duck", "Do some SQL queries");
  }

  private formatSqlQueryAndResult(sql: string, markdown: string) {
    return [
      // show query
      "```sql",
      sql,
      "```",
      // show results
      markdown,
    ];
  }

  async execute(chat: ChatCraftChat, _user: User | undefined, args?: string[]) {
    let sql: string;
    let markdown: string;
    const messageParts: string[] = [];

    if (!args?.length) {
      // Show all the tables, as well as the chatcraft.* virtual tables
      sql = "SHOW TABLES;";
      const tablesMarkdown = await getTables();
      messageParts.push(...this.formatSqlQueryAndResult(sql, tablesMarkdown));

      // Include files if there are any
      const filesMarkdown = await getFiles(chat);
      if (filesMarkdown) {
        sql = "SELECT * FROM glob('*');";
        messageParts.push(...this.formatSqlQueryAndResult(sql, filesMarkdown));
      }
    } else {
      sql = args.join(" ");
      markdown = await queryToMarkdown(sql, { chat });
      messageParts.push(...this.formatSqlQueryAndResult(sql, markdown));
    }

    const message = messageParts.join("\n");
    return chat.addMessage(new ChatCraftHumanMessage({ text: message }));
  }
}
