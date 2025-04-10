import { EmbeddingProvider } from "./EmbeddingProvider";

/**
 * TensorFlow.js-based embedding provider
 * Uses Universal Sentence Encoder for local embedding generation
 */
export class TensorflowEmbeddingProvider implements EmbeddingProvider {
  readonly id = "tensorflow-use";
  readonly name = "TensorFlow Universal Sentence Encoder";
  readonly description = "Local embedding model using TensorFlow.js (512 dimensions)";
  readonly dimensions = 512;

  private model: any = null;
  private isLoading: boolean = false;
  private loadPromise: Promise<void> | null = null;

  constructor() {}

  /**
   * Load the model if it hasn't been loaded yet
   */
  private async loadModelIfNeeded(): Promise<void> {
    if (this.model) return;

    if (!this.loadPromise) {
      this.isLoading = true;

      this.loadPromise = (async () => {
        try {
          console.log("Loading Universal Sentence Encoder model...");

          await import("@tensorflow/tfjs");

          const use = await import("@tensorflow-models/universal-sentence-encoder");

          this.model = await use.load();
          console.log("Universal Sentence Encoder loaded successfully");
        } catch (err) {
          console.error("Failed to load Universal Sentence Encoder:", err);
          this.loadPromise = null;
          throw err;
        } finally {
          this.isLoading = false;
        }
      })();
    }

    return this.loadPromise;
  }

  /**
   * Generate an embedding vector for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const result = await this.generateBatchEmbeddings([text]);
    return result[0];
  }

  /**
   * Generate embedding vectors for multiple texts in batch
   */
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      await this.loadModelIfNeeded();

      const embeddings = await this.model.embed(texts);

      const arrays = await embeddings.array();

      embeddings.dispose();

      return arrays;
    } catch (error: any) {
      console.error("Error generating TensorFlow embeddings:", error);
      throw new Error(`TensorFlow embedding error: ${error.message || "Unknown error"}`);
    }
  }
}
