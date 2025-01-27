/**
 * The `fs` module is a unified filesystem view into files stored
 * in Dexie as ChatCraftFile objects and also into DuckDB and its
 * WebFiles. The functions here provide a generic way to work with the
 * "files" available in a chat, be they ChatCraft attachments or
 * data created in DuckDB.
 */

import { WebFile } from "@duckdb/duckdb-wasm";
import { ChatCraftChat } from "./ChatCraftChat";
import { ChatCraftFile } from "./ChatCraftFile";
import { globFiles, isUsingDuckDB, withConnection } from "./duckdb";
import { download } from "./utils";

export class FileNotFoundError extends Error {
  constructor(path: string) {
    super(`File not found: "${path}"`);
    this.name = "FileNotFoundError";
  }
}

/**
 * Generic representation of either a ChatCraftFile or DuckDB WebFile
 */
export interface VirtualFile {
  /** File's id */
  id: string;
  /** Name of file */
  name: string;
  /** Size of file in bytes */
  size: number;
  /** MIME type of file */
  type: string;

  blob(): Promise<Blob>;
  removeFile(): Promise<void>;
  toURL(): Promise<string>;
  download(): Promise<void>;
}

/**
 * The ChatCraftFile version of a VirtualFile
 */
class ChatCraftFileAdapter implements VirtualFile {
  readonly id: string;
  readonly name: string;
  readonly size: number;
  readonly type: string;
  readonly chatCraftFile: ChatCraftFile;

  constructor(chatCraftFile: ChatCraftFile) {
    this.chatCraftFile = chatCraftFile;
    this.id = chatCraftFile.id;
    this.name = chatCraftFile.name;
    this.size = chatCraftFile.size;
    this.type = chatCraftFile.type;
  }

  async blob(): Promise<Blob> {
    return this.chatCraftFile.content;
  }

  async removeFile(): Promise<void> {
    return await ChatCraftFile.delete(this.chatCraftFile.id);
  }

  async toURL(): Promise<string> {
    return await this.chatCraftFile.toURL();
  }

  async download(): Promise<void> {
    return this.chatCraftFile.download();
  }
}

/**
 * The DuckDB WebFile version of a VirtualFile
 */
class WebFileAdapter implements VirtualFile {
  readonly id: string;
  readonly name: string;
  readonly size: number;
  readonly type: string;

  constructor(webFile: WebFile) {
    this.id = String(webFile.fileId) || "unknown";
    this.name = webFile.fileName;
    this.size = webFile.fileSize || 0;
    this.type = WebFileAdapter.getFileType(webFile.fileName);
  }

  /**
   * Determine the type of a WebFile based on its filename (i.e., extension).
   * If we can't infer it, we'll use `application/octet-stream` by default.
   */
  private static getFileType(fileName: string): string {
    // Default MIME type for unknown files
    const defaultType = "application/octet-stream";

    // Extract extension (convert to lowercase for consistency)
    const ext = fileName.split(".").pop()?.toLowerCase() || "";

    // Map of supported extensions to MIME types
    const mimeTypes: Record<string, string> = {
      // CSV and text variants
      csv: "text/csv",
      tsv: "text/tab-separated-values",
      txt: "text/plain",

      // Parquet
      parquet: "application/vnd.apache.parquet",

      // JSON
      json: "application/json",
      jsonl: "application/jsonl",

      // Excel
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      xls: "application/vnd.ms-excel",

      // SQLite
      db: "application/x-sqlite3",
      sqlite: "application/x-sqlite3",
      sqlite3: "application/x-sqlite3",
    };

    return mimeTypes[ext] || defaultType;
  }

  async blob(): Promise<Blob> {
    return withConnection<Blob>(async (_conn, duckdb) => {
      const buf = await duckdb.copyFileToBuffer(this.name);
      return new Blob([buf], { type: this.type });
    });
  }

  async removeFile(): Promise<void> {
    return withConnection(async (_conn, duckdb) => {
      await duckdb.dropFile(this.name);
    });
  }

  async toURL(): Promise<string> {
    const blob = await this.blob();
    return URL.createObjectURL(blob);
  }

  async download(): Promise<void> {
    const blob = await this.blob();
    download(blob, this.name, this.type);
  }
}

/**
 * List all ChatCraftFiles and DuckDB WebFiles. When there are duplicates,
 * between the two filesystems, use the ChatCraftFile.
 */
export async function ls(chat: ChatCraftChat): Promise<VirtualFile[]> {
  const fileMap = new Map<string, VirtualFile>();

  // If we're using DuckDB, add those files first. We'll overwrite with
  // ChatCraftFiles if there are dupes.
  if (isUsingDuckDB()) {
    const duckDbFiles = await globFiles();
    duckDbFiles.forEach((file) => {
      fileMap.set(file.fileName, new WebFileAdapter(file));
    });
  }

  // Add ChatCraftFiles from Dexie, overwriting any dupes
  const chatCraftFiles = await chat.files();
  chatCraftFiles.forEach((file) => {
    fileMap.set(file.name, new ChatCraftFileAdapter(file));
  });

  return Array.from(fileMap.values());
}

export async function getFile(path: string, chat: ChatCraftChat): Promise<VirtualFile> {
  const files = await ls(chat);
  const file = files.find((f) => f.name === path);
  if (!file) {
    throw new FileNotFoundError(path);
  }
  return file;
}

export async function readFile(path: string, chat: ChatCraftChat): Promise<Blob> {
  const file = await getFile(path, chat);
  return file.blob();
}

export async function exists(path: string, chat: ChatCraftChat): Promise<boolean> {
  try {
    await getFile(path, chat);
    return true;
  } catch (error) {
    if (error instanceof FileNotFoundError) {
      return false;
    }
    throw error;
  }
}

export async function removeFile(path: string, chat: ChatCraftChat): Promise<void> {
  const file = await getFile(path, chat);
  await file.removeFile();
}

export async function fileToUrl(path: string, chat: ChatCraftChat): Promise<string> {
  const file = await getFile(path, chat);
  return file.toURL();
}

export async function downloadFile(path: string, chat: ChatCraftChat): Promise<void> {
  const file = await getFile(path, chat);
  await file.download();
}
