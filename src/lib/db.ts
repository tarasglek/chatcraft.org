import Dexie, { Table } from "dexie";
import { ChatCraftChat, SerializedChatCraftChat } from "./ChatCraftChat";

import type { MessageType, FunctionCallParams, FunctionCallResult } from "./ChatCraftMessage";
import { insertJSON } from "./duckdb";

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
  imageUrls?: string[];
  versions?: { id: string; date: Date; model: string; text: string; imageUrls?: string[] }[];
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
    // Version 9 Migration - add imageUrls
    this.version(9).stores({
      messages: "id, date, chatId, type, model, user, text, imageUrls, versions",
    });
    // Version 10 Migration - address schema warning, fix table consistency
    this.version(10)
      .stores({
        messages: "id, date, chatId, type, model, user, text, imageUrls, versions",
      })
      .upgrade(async (tx) => {
        // Clean up any lingering starred properties from messages
        await tx
          .table("messages")
          .toCollection()
          .modify((message) => {
            delete message.starred;
          });
      });

    this.chats = this.table("chats");
    this.messages = this.table("messages");
    this.shared = this.table("shared");
    this.functions = this.table("functions");
    this.starred = this.table("starred");
  }

  /**
   * Exports all tables from Dexie to DuckDB
   * @returns Object containing table names and row counts
   */
  async exportToDuckDB(): Promise<{
    tables: { name: string; rowCount: number }[];
  }> {
    // Step 1: Get data from each Dexie table
    const tableNames: Array<
      keyof Pick<typeof this, "chats" | "messages" | "shared" | "functions" | "starred">
    > = ["chats", "messages", "shared", "functions", "starred"];

    const tableData = await Promise.all(
      tableNames.map(async (name) => ({
        name,
        data: await this[name].toArray(),
      }))
    );

    // Step 2: Create tables in DuckDB
    const results = [];
    for (const { name, data } of tableData) {
      // Skip empty tables
      if (data.length === 0) {
        results.push({ name, rowCount: 0 });
        continue;
      }

      // Convert dates to ISO strings for JSON serialization
      const jsonData = data.map((record) => ({
        ...record,
        date: record.date instanceof Date ? record.date.toISOString() : record.date,
      }));

      try {
        // Create table in DuckDB from JSON
        await insertJSON(name, JSON.stringify(jsonData));

        results.push({
          name,
          rowCount: data.length,
        });
      } catch (err) {
        console.error(`Error creating table ${name} in DuckDB:`, err);
        throw err;
      }
    }

    return { tables: results };
  }
}

const db = new ChatCraftDatabase();

export default db;
