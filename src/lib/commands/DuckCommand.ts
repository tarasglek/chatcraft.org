import { ChatCraftCommand } from "../ChatCraftCommand";
import { ChatCraftChat } from "../ChatCraftChat";
import { ChatCraftHumanMessage } from "../ChatCraftMessage";
import { getTables, queryToMarkdown } from "../duckdb-chatcraft";

export class DuckCommand extends ChatCraftCommand {
  constructor() {
    super("duck", "/duck", "Do some SQL queries");
  }

  async execute(chat: ChatCraftChat, _user: User | undefined, args?: string[]) {
    let sql: string;
    let markdown: string;

    if (!args?.length) {
      sql = "SHOW TABLES;";
      markdown = await getTables();
    } else {
      sql = args.join(" ");
      markdown = await queryToMarkdown(sql);
    }

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
