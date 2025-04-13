/**
 * Base interface for embedding providers
 */
export interface EmbeddingProvider {
  /**
   * Unique identifier for the provider
   */
  readonly id: string;

  /**
   * Display name of the provider
   */
  readonly name: string;

  /**
   * Description of the embedding model
   */
  readonly description: string;

  /**
   * Number of dimensions in the embedding vectors
   */
  readonly dimensions: number;

  /**
   * Maximum batch size of the provider
   */
  readonly maxBatchSize: number;

  /**
   * Generate an embedding vector for a single text
   * @param text The text to embed
   * @returns A promise resolving to a vector of numbers
   */
  generateEmbedding(text: string): Promise<number[]>;

  /**
   * Generate embedding vectors for multiple texts in batch
   * @param texts Array of texts to embed
   * @returns A promise resolving to an array of embedding vectors
   */
  generateBatchEmbeddings(texts: string[]): Promise<number[][]>;
}
