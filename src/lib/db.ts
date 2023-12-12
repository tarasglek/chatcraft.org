import Dexie, { Table } from "dexie";
import { ChatCraftChat, SerializedChatCraftChat } from "./ChatCraftChat";

import type { MessageType, FunctionCallParams, FunctionCallResult } from "./ChatCraftMessage";

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
  image?: string[];
  versions?: { id: string; date: Date; model: string; text: string; image?: string[] }[];
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

export type ChatCraftStarredSystemPromptTable = {
  text: string;
  date: Date;
  usage: number;
};

class ChatCraftDatabase extends Dexie {
  chats: Table<ChatCraftChatTable, string>;
  messages: Table<ChatCraftMessageTable, string>;
  shared: Table<SharedChatCraftChatTable, string>;
  functions: Table<ChatCraftFunctionTable, string>;
  starred: Table<ChatCraftStarredSystemPromptTable, string>;

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
    // Version 7 Migration - adds .starred to messages table
    this.version(7).stores({
      messages: "id, date, chatId, type, model, user, text, versions, starred",
    });
    // Version 8 Migration - adds and populates starred table and
    // removes starred property from messages table.
    this.version(8)
      .stores({
        messages: "id, date, chatId, type, model, user, text, versions, starred",
        starred: "text, date, usage",
      })
      .upgrade(async (tx) => {
        await tx
          .table("messages")
          .where({ type: "system" })
          .each(async (record: ChatCraftMessageTable) => {
            const starred = await tx.table("starred").get(record.text);
            if (starred) {
              const earliestDate = record.date > starred.date ? starred.date : record.date;
              return await tx
                .table("starred")
                .where({ text: starred.text })
                .modify({ usage: starred.usage + 1, date: earliestDate });
            }
            await tx.table("starred").add({
              text: record.text,
              date: record.date,
              usage: 1,
            });
          });
        await tx.table("messages").where({ type: "system" }).modify({ starred: undefined });
      });
    // Version 9 Migration - removes .starred index from messages table
    this.version(9).stores({
      messages: "id, date, chatId, type, model, user, text, image, versions",
    });

    this.chats = this.table("chats");
    this.messages = this.table("messages");
    this.shared = this.table("shared");
    this.functions = this.table("functions");
    this.starred = this.table("starred");
  }
}

const db = new ChatCraftDatabase();

export default db;
