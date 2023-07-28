import Dexie, { Table } from "dexie";
import { ChatCraftChat, SerializedChatCraftChat } from "./ChatCraftChat";

import type { MessageType } from "langchain/schema";
import type { FunctionCallParams, FunctionCallResult } from "./ChatCraftMessage";

export type ChatCraftChatTable = {
  id: string;
  date: Date;
  summary?: string;
  messageIds: string[];
};

export type ChatCraftMessageTable = {
  id: string;
  date: Date;
  chatId: string;
  type: MessageType;
  model?: string;
  user?: User;
  func?: FunctionCallParams | FunctionCallResult;
  text: string;
  versions?: { id: string; date: Date; model: string; text: string }[];
};

export type SharedChatCraftChatTable = {
  id: string;
  url: string;
  summary: string;
  date: Date;
  chat: SerializedChatCraftChat;
};

export type ChatCraftFunctionTable = {
  id: string;
  date: Date;
  name: string;
  description: string;
  parameters: object;
  code: string;
};

class ChatCraftDatabase extends Dexie {
  chats: Table<ChatCraftChatTable, string>;
  messages: Table<ChatCraftMessageTable, string>;
  shared: Table<SharedChatCraftChatTable, string>;
  functions: Table<ChatCraftFunctionTable, string>;

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
    // Version 3 Migration - add versions to messages
    this.version(3).stores({
      messages: "id, date, chatId, type, model, user, text, versions",
    });
    // Version 4 Migration - chat summary becomes optional
    this.version(4).stores({
      chats: "id, date, shareUrl, summary, messageIds",
    });
    // Version 5 Migration - removes shareUrl from chats, adds `shared` table
    this.version(5)
      .stores({
        chats: "id, date, summary, messageIds",
        shared: "id, url, summary, date, chat",
      })
      // This migration needs a data upgrade step as well
      .upgrade(async (tx) => {
        // Transfer all chats with a `shareUrl` to the `shared` table
        await tx.table("chats").each(async (record: ChatCraftChatTable) => {
          const chat = await tx.table("chats").get(record.id);
          if (!chat.shareUrl) {
            return;
          }

          const messages = await tx.table("messages").bulkGet(record.messageIds);
          await tx.table("shared").add({
            id: chat.id,
            url: chat.shareUrl,
            summary: chat.summary,
            date: chat.date,
            chat: ChatCraftChat.fromDB(chat, messages).toJSON(),
          });
        });

        // Remove all the `shareUrl` properties
        return tx
          .table("chats")
          .toCollection()
          .modify((chat) => {
            delete chat.shareUrl;
          });
      });
    // Version 6 Migration - adds functions table, .func to chats table
    this.version(6).stores({
      functions: "id, date, name, description",
    });

    this.chats = this.table("chats");
    this.messages = this.table("messages");
    this.shared = this.table("shared");
    this.functions = this.table("functions");
  }
}

const db = new ChatCraftDatabase();

export default db;
