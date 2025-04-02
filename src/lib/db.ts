import Dexie, { Table } from "dexie";
import { ChatCraftChat, SerializedChatCraftChat } from "./ChatCraftChat";

import type { MessageType, FunctionCallParams, FunctionCallResult } from "./ChatCraftMessage";

// List of all known table names
export const CHATCRAFT_TABLES = [
  "chats",
  "messages",
  "shared",
  "functions",
  "starred",
  "files",
] as const;
export type ChatCraftTableName = (typeof CHATCRAFT_TABLES)[number];

/**
 * Checks if a table name exists in Dexie
 */
export function isChatCraftTableName(name: string): name is ChatCraftTableName {
  return CHATCRAFT_TABLES.includes(name as ChatCraftTableName);
}

/** Represents a file reference within a chat */
export type FileRef = {
  /** Unique identifier of the file (content hash) */
  id: string;
  /** Display name of the file in this chat context */
  name: string;
};

export function isFileRef(value: unknown): value is FileRef {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof (value as FileRef).id === "string" &&
    "name" in value &&
    typeof (value as FileRef).name === "string"
  );
}

export type ChatCraftChatTable = {
  id: string;
  date: Date;
  summary?: string;
  messageIds: string[];
  fileRefs?: FileRef[];
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

export type ChatCraftFileTable = {
  id: string; // unique hash of the file contents, for deduping
  name: string; // original file name
  type: string; // mime-type of the file (e.g., "text/csv")
  size: number; // size of file in bytes
  content: Blob; // binary content of file
  text?: string; // extracted text of file, base64 encoded version, etc
  created: Date; // when the file was created
  metadata?: Record<string, unknown>; // extra metadata
  chunks?: { text: string; index: number }; // Text chunks for RAG
  embeddings?: { embedding: number[]; chunkIndex: number }[]; // Vector embeddings for chunks
};

class ChatCraftDatabase extends Dexie {
  chats: Table<ChatCraftChatTable, string>;
  messages: Table<ChatCraftMessageTable, string>;
  shared: Table<SharedChatCraftChatTable, string>;
  functions: Table<ChatCraftFunctionTable, string>;
  starred: Table<ChatCraftStarredSystemPromptTable, string>;
  files: Table<ChatCraftFileTable, string>;

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
    // Version 11 Migration - add files table. NOTE: we are not migrating imageUrls over to
    // files in this migration, though we may do that in the future.
    this.version(11).stores({
      // Remove imageUrls from index for messages
      messages: "id, date, chatId, type, model, user, text, versions",
      files: "id, name, type, size, text, created",
    });
    // Version 12 Migration - update the fileIds to files and FileRefs with
    // both file id and name, so files can have different names per-chat.
    this.version(12).upgrade(async (tx) => {
      // Get all chats with fileIds
      const chats = await tx
        .table("chats")
        .filter((chat) => Array.isArray(chat.fileIds) && chat.fileIds.length > 0)
        .toArray();

      // Update each chat's fileIds to files with FileRefs
      for (const chat of chats) {
        const { fileIds } = chat;
        if (!fileIds?.length) {
          continue;
        }

        const fileRefs: FileRef[] = (
          await Promise.all(
            fileIds.map(async (fileId: string) => {
              const file = await tx.table<ChatCraftFileTable>("files").get(fileId);
              if (!file) {
                return null;
              }
              return {
                id: fileId,
                name: file.name,
              };
            })
          )
        ).filter((fileRef: FileRef | null): fileRef is FileRef => fileRef !== null);

        // Update the chat with the new fileRefs array and remove old fileIds
        await tx.table<ChatCraftChatTable>("chats").update(chat.id, {
          ...chat,
          fileRefs,
          fileIds: undefined, // Remove the old property
        });
      }
    });

    this.chats = this.table("chats");
    this.messages = this.table("messages");
    this.shared = this.table("shared");
    this.functions = this.table("functions");
    this.starred = this.table("starred");
    this.files = this.table("files");
  }

  /**
   * Get a ChatCraftTable by name
   */
  byTableName(tableName: ChatCraftTableName) {
    switch (tableName) {
      case "chats":
        return this.chats;
      case "messages":
        return this.messages;
      case "shared":
        return this.shared;
      case "functions":
        return this.functions;
      case "starred":
        return this.starred;
      case "files":
        return this.files;
      default:
        throw new Error(`Unknown table name: ${tableName}`);
    }
  }
}

const db = new ChatCraftDatabase();

export default db;
