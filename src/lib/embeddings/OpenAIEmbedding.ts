import { EmbeddingProvider } from "./EmbeddingProvider";
import OpenAI from "openai";

/**
 * OpenAI embedding provider - uses the OpenAI API to generate embeddings
 */
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly id = "openai-text-embedding-3-small";
  readonly name = "OpenAI text-embedding-3-small";
  readonly description = "OpenAI's text-embedding-3-small model (1536 dimensions)";
  readonly dimensions = 1536;
  readonly url = `https://api.openai.com/v1/embeddings`;

  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
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
      const response = await this.openai.embeddings.create({
        model: "text-embedding-3-small",
        input: texts,
        encoding_format: "float",
      });

      return response.data.map((item) => item.embedding);
    } catch (error: any) {
      console.error("Error generating OpenAI embeddings:", error);
      throw new Error(`OpenAI API error: ${error.message || "Unknown error"}`);
    }
  }
}
