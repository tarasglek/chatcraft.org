import db, { ChatCraftFileTable } from "./db";
import { download } from "./utils";
import { getSentenceChunksFrom } from "./summarize";
import { getEmbeddingProvider, EmbeddingProviderType } from "./embeddings";
import { getSettings } from "./settings";

export type FileChunk = {
  text: string;
  embeddings: number[];
  metadata?: Record<string, unknown>;
};

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
  /** File chunks */
  chunks?: FileChunk[];
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
  chunks?: FileChunk[];

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
    this.chunks = options.chunks;
  }

  get extension(): string {
    return this.name.split(".").pop() || "";
  }

  // When we store files in a chat, we can use a different name (e.g., the same
  // file contents stored in multiple chats, but in between each chat we've renamed
  // the file). This is the original filename that was used when the file's contents
  // were first stored.
  get originalName(): string {
    return this.name;
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
    console.log("findOrCreate invoked");
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

      console.log("Metadata that is getting used", options.metadata);
      console.log("Additional Metadata: ", additionalOptions);
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
   * Get a specific chunk by array index
   */
  getChunk(index: number): FileChunk | undefined {
    return this.chunks?.[index];
  }

  /**
   * Get the embedding provider used for this file's chunks
   */
  getEmbeddingProviderId(): string | undefined {
    if (!this.hasEmbeddings() || !this.metadata) {
      return undefined;
    }

    return this.metadata.embeddingProvider as string;
  }

  /**
   * Get embedding dimensions
   */
  getEmbeddingDimensions(): number | undefined {
    if (!this.hasEmbeddings() || !this.metadata) {
      return undefined;
    }

    return this.metadata.embeddingDimensions as number;
  }

  /**
   * Set metadata value
   */
  async setMetadata(key: string, value: unknown): Promise<void> {
    if (!this.metadata) {
      this.metadata = {};
    }
    this.metadata[key] = value;
    await db.files.update(this.id, this.metadata);
  }

  /**
   * Set chunks value
   */
  async setChunks(chunks: FileChunk[]): Promise<void> {
    this.chunks = chunks;
    await db.files.update(this.id, { chunks });
  }

  /**
   * Check if file has been chunked
   */
  hasChunks(): boolean {
    return !!this.chunks && this.chunks.length > 0;
  }

  /**
   * Check if all chunks have embeddings
   */
  hasEmbeddings(): boolean | undefined {
    if (!this.hasChunks()) {
      return false;
    }

    return this.chunks?.some((chunk) => chunk.embeddings.length > 0);
  }

  /**
   * Generate embeddings for all chunks
   */
  async generateEmbeddings(providerType?: EmbeddingProviderType): Promise<void> {
    if (!this.hasChunks()) {
      throw new Error("File has no chunks to generate embeddings for");
    }

    const settings = getSettings();
    const provider = getEmbeddingProvider(providerType || settings.embeddingProvider);
    const chunks = this.chunks!;

    console.log(`Generating embeddings for ${chunks.length} chunks using ${provider.name}...`);

    const BATCH_SIZE = settings.embeddingBatchSize || 20;

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const texts = batch.map((chunk) => chunk.text);

      try {
        const embeddings = await provider.generateBatchEmbeddings(texts);

        // Update each chunk
        for (let j = 0; j < batch.length; j++) {
          chunks[i + j].embeddings = embeddings[j];
        }

        console.log(
          `Generated embeddings for batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)}`
        );
      } catch (error) {
        console.error(`Error generating embeddings for batch starting at chunk ${i}:`, error);
        throw error;
      }
    }
    this.setMetadata("embeddingProvider", provider.id);
    this.setMetadata("embeddingDimensions", provider.dimensions);
    this.setMetadata("embeddingData", new Date().toISOString());
    await this.setChunks(chunks);
    console.log(`Successfully generated embeddings for all ${chunks.length} chunks`);
  }

  /**
   * Generates chunks from file text content with overlap
   * Skips files less than 300KB
   */
  async generateChunks(
    maxCharsPerChunk: number = 1000,
    overlapPercentage: number = 20
  ): Promise<FileChunk[]> {
    if (!this.text) {
      throw new Error("File has no text content to chunk!");
    }

    const MIN_SIZE = 300000; // 300KB in bytes

    if (this.size <= MIN_SIZE) {
      console.log(
        `File ${this.name} is too small (${this.size} bytes / ${Math.round(this.size / 1024)}KB), skipping chunking`
      );
      return [];
    }

    const baseChunks = getSentenceChunksFrom(this.text, maxCharsPerChunk);

    const chunksWithOverlap = this.addOverlapToChunks(
      baseChunks,
      maxCharsPerChunk,
      overlapPercentage
    );

    const chunks: FileChunk[] = chunksWithOverlap.map((text, index) => ({
      text,
      embeddings: [],
      // Some metadata loaded, since we added it :)
      metadata: {
        index,
        length: text.length,
        fileSize: this.size,
        fileName: this.name,
        strategy: "fixed-size-with-overlap",
        overlapPercentage,
      },
    }));

    await this.setChunks(chunks);

    console.log(
      `Generated ${chunks.length} chunks with ${overlapPercentage}% overlap for file: ${this.name} (${Math.round(this.size / 1024)}KB)`
    );

    return chunks;
  }

  /**
   * Helper method to add overlap between chunks
   */
  private addOverlapToChunks(
    chunks: string[],
    maxCharsPerChunk: number,
    overlapPercentage: number
  ): string[] {
    // If we have 0 or 1 chunks, we don't need an overlap
    if (chunks.length <= 1) return chunks;

    const result: string[] = [];
    const overlapSize = Math.max(50, Math.floor((maxCharsPerChunk * overlapPercentage) / 100));

    for (let i = 0; i < chunks.length; i++) {
      if (i === 0) {
        result.push(chunks[i]);
      } else {
        const prevChunk = chunks[i - 1];
        const currentChunk = chunks[i];

        // Take the last part of the previous chunk for overlap
        let overlapText = "";
        if (prevChunk.length > overlapSize) {
          const startPos = prevChunk.length - overlapSize;
          const firstSpacePos = prevChunk.indexOf(" ", startPos);

          if (firstSpacePos !== -1) {
            overlapText = prevChunk.substring(firstSpacePos + 1);
          } else {
            // No space found, using raw overlap
            overlapText = prevChunk.substring(startPos);
          }
        }

        // Create new chunk with overlap
        if (overlapText && !currentChunk.startsWith(overlapText)) {
          result.push(overlapText + " " + currentChunk);
        } else {
          result.push(currentChunk);
        }
      }
    }

    return result;
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
      chunks: this.chunks,
    };
  }

  static fromDB(file: ChatCraftFileTable) {
    return new ChatCraftFile(file.id, file);
  }
}
