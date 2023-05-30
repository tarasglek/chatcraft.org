import Dexie, { Table } from "dexie";
import { type MessageType } from "langchain/schema";

export type ChatCraftChatTable = {
  id: string;
  version: string;
  date: number;
  isPublic: boolean;
  summary: string;
  messageIds: string[];
};

export type ChatCraftMessageTable = {
  id: string;
  chatId: string;
  type: MessageType;
  model?: GptModel;
  user?: User;
  text: string;
};

class ChatCraftDatabase extends Dexie {
  chats: Table<ChatCraftChatTable, string>;
  messages: Table<ChatCraftMessageTable, string>;

  constructor() {
    super("ChatCraftDatabase");
    this.version(1).stores({
      chats: "id, version, date, summary, messageIds",
      messages: "id, chatId, type, model, user, text",
    });

    this.chats = this.table("chats");
    this.messages = this.table("messages");
  }
}

const db = new ChatCraftDatabase();

export default db;
