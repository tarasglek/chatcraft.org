import { getSettings } from "../settings";
import { EmbeddingProvider } from "./EmbeddingProvider";

/**
 * OpenAI embedding provider - uses the OpenAI API to generate embeddings
 */
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly id = "openai-text-embedding-3-small";
  readonly name = "OpenAI text-embedding-3-small";
  readonly description = "OpenAI's text-embedding-3-small model (1536 dimensions)";
  readonly dimensions = 1536;
  readonly url = `https://api.openai.com/v1/embeddings`;

  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
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
      const settings = getSettings();
      console.log(`Current API KEY is: ${settings.currentProvider.apiKey}`);
      const response = await fetch(`${this.url}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.currentProvider.apiKey}`,
        },
        body: JSON.stringify({
          model: `text-embedding-3-small`,
          input: texts,
          encoding_format: "float",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
      }
      const res = await response.json();
      return res.data.map((item: any) => item.embedding);
    } catch (error: any) {
      console.error("Error generating OpenAI embeddings:", error);
      throw new Error(`OpenAI API error: ${error.message || "Unknown error"}`);
    }
  }
}
