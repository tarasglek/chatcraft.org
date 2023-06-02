import Dexie, { Table } from "dexie";
import { type MessageType } from "langchain/schema";

export type ChatCraftChatTable = {
  id: string;
  date: Date;
  shareUrl?: string;
  summary: string;
  messageIds: string[];
};

export type ChatCraftMessageTable = {
  id: string;
  date: Date;
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
    // Initial Version
    this.version(1).stores({
      chats: "id, date, summary, messageIds",
      messages: "id, date, chatId, type, model, user, text",
    });
    // Version 2 Migration - remove isPublic from chats and add
    // shareUrl instead. The messages table is unchanged
    this.version(2).stores({
      chats: "id, date, shareUrl, summary, messageIds",
    });

    this.chats = this.table("chats");
    this.messages = this.table("messages");
  }
}

const db = new ChatCraftDatabase();

export default db;
