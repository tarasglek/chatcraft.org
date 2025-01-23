import db, { ChatCraftFileTable } from "./db";
import { download } from "./utils";

export type ChatCraftFileOptions = {
  /** Filename */
  name: string;
  /** File type (mime-type) */
  type: string;
  /** File's content (binary) */
  content: Blob;
  /** Extracted/parsed text content, if any */
  text?: string;
  /** Extra file metadata */
  metadata?: Record<string, unknown>;
};

export class ChatCraftFile {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly size: number;
  readonly content: Blob;
  text?: string;
  readonly created: Date;
  metadata?: Record<string, unknown>;

  private constructor(id: string, options: ChatCraftFileOptions) {
    this.id = id;

    // Validate that we get a filename
    if (!options.name?.trim()) {
      throw new Error("File name is required");
    }
    this.name = options.name;

    // Validate the type
    if (!/^[^/]+\/[^/]+/.test(options.type)) {
      throw new Error("File type must be a valid mime-type");
    }
    this.type = options.type;

    this.content = options.content;
    this.size = options.content.size;
    this.text = options.text;
    this.created = new Date();
    this.metadata = options.metadata;
  }

  get extension(): string {
    return this.name.split(".").pop() || "";
  }

  /**
   * Calculate the sha-256 hash for file's content
   * @param blob content of file
   * @returns hex string with file hash
   */
  private static async calculateHash(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer();
    // Calculate SHA-256 hash
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return hashHex;
  }

  /**
   * Find an existing ChatCraftFile in the database or add a new one.
   * @param input File or ChatCraftOptions
   * @returns ChatCraftFile instance
   */
  static async findOrCreate(
    input: File | ChatCraftFileOptions,
    additionalOptions: Partial<ChatCraftFileOptions>
  ): Promise<ChatCraftFile> {
    let options: ChatCraftFileOptions;

    if (input instanceof File) {
      options = {
        name: input.name,
        type: input.type || "application/octet-stream",
        content: input,
        metadata: {
          lastModified: new Date(input.lastModified),
        },
      };

      // Merge any additional options provided
      if (additionalOptions) {
        options = {
          ...options,
          ...additionalOptions,
          // Merge the two metadata properties
          metadata: {
            ...options.metadata,
            ...additionalOptions.metadata,
          },
        };
      }
    } else {
      options = input;
    }

    const id = await ChatCraftFile.calculateHash(options.content);

    // Return existing file, if present in db
    const existing = await ChatCraftFile.findById(id);
    if (existing) {
      return existing;
    }

    // Otherwise, create and store a new file
    const file = new ChatCraftFile(id, options);
    await db.files.add(file.toDB());
    return file;
  }

  /**
   * Find an existing file by its id
   * @param fileId the file's id (hash)
   * @returns the ChatCraftFile, if found
   */
  static async findById(fileId: string): Promise<ChatCraftFile | undefined> {
    const existing = await db.files.get(fileId);
    if (existing) {
      return ChatCraftFile.fromDB(existing);
    }
  }

  /**
   * Find an existing file by its content hash
   * @param content Blob or File to look up
   * @returns Existing ChatCraftFile or null if not found
   */
  static async findByContent(content: Blob | File): Promise<ChatCraftFile | undefined> {
    const id = await ChatCraftFile.calculateHash(content);
    return ChatCraftFile.findById(id);
  }

  /**
   * Delete an existing file from the database
   * @param fileOrId the ChatCraftFile or ChatCraftFile id to delete
   */
  static async delete(fileOrId: string | ChatCraftFile) {
    const fileId = typeof fileOrId === "string" ? fileOrId : fileOrId.id;
    return db.files.delete(fileId);
  }

  /**
   * Get metadata value with type safety
   */
  getMetadata<T>(key: string): T | undefined {
    return this.metadata?.[key] as T;
  }

  /**
   * Set metadata value
   */
  setMetadata(key: string, value: unknown): void {
    if (!this.metadata) {
      this.metadata = {};
    }
    this.metadata[key] = value;
  }

  /**
   * Download the file
   */
  download() {
    download(this.content, this.name, this.type);
  }

  /**
   * Helper methods for common mime types
   */
  isImage(): boolean {
    return this.type.startsWith("image/");
  }

  isText(): boolean {
    return this.type.startsWith("text/");
  }

  isJSON(): boolean {
    return this.type.startsWith("application/json");
  }

  isCSV(): boolean {
    return this.type.startsWith("text/csv");
  }

  isMarkdown(): boolean {
    return this.type.startsWith("application/markdown");
  }

  isPDF(): boolean {
    return this.type.startsWith("application/pdf");
  }

  isWord(): boolean {
    return this.type.startsWith(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
  }

  /**
   * Convert a ChatCraftFile to a File object
   */
  toFile(): File {
    return new File([this.content], this.name, {
      type: this.type,
      lastModified: this.created.getTime(),
    });
  }

  /**
   * Get a URL Object for the file content. Callers are responsible
   * for revoking this URL when done using it.
   */
  toURL(): string {
    return URL.createObjectURL(this.content);
  }

  toDB(): ChatCraftFileTable {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      size: this.size,
      content: this.content,
      text: this.text,
      created: this.created,
      metadata: this.metadata,
    };
  }

  static fromDB(file: ChatCraftFileTable) {
    return new ChatCraftFile(file.id, file);
  }
}

export type ListFilesOptions = {
  /** Maximum number of files to return */
  limit?: number;
  /** Skip expired files */
  skipExpired?: boolean;
};

/**
 * List files in the database matching a glob pattern
 *
 * Supports common glob patterns:
 * - * matches any number of characters (except /)
 * - ? matches exactly one character
 * - {pattern,pattern} matches any pattern in braces
 *
 * Examples:
 * - *.csv           -> matches: test.csv, data.csv
 * - data/*.json     -> matches: data/config.json, data/1.json
 * - logs/????-*.log -> matches: logs/2023-01.log, logs/2024-02.log
 *
 * @param pattern Glob pattern (defaults to '*' for all files)
 * @param options Listing options for sorting and filtering
 * @returns Array of matching ChatCraftFile instances
 */
export async function ls(
  pattern: string = "*",
  options: ListFilesOptions = {}
): Promise<ChatCraftFile[]> {
  const opts = {
    limit: 10,
    skipExpired: true,
    // Override defaults
    ...options,
  };

  // Convert glob pattern to regex:
  // 1. Escape special regex characters except * and ?
  // 2. Convert * to match any chars except /
  // 3. Convert ? to match exactly one char
  // 4. Wrap in ^ and $ to match entire string
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");

  const regex = new RegExp(`^${regexPattern}$`);

  let query = db.files.filter((file) => regex.test(file.name));

  // Apply options
  if (options.limit) {
    query = query.limit(opts.limit);
  }

  const matches = await query.toArray();
  return matches.map((file) => ChatCraftFile.fromDB(file));
}
