import { EmbeddingProvider } from "./EmbeddingProvider";
import { OpenAIEmbeddingProvider } from "./OpenAIEmbedding";
import { TensorflowEmbeddingProvider } from "./TensorflowEmbedding";
import { getSettings } from "../settings";

/**
 * Supported embedding provider types
 */
export type EmbeddingProviderType = "openai" | "tensorflow";

const providers: Record<EmbeddingProviderType, EmbeddingProvider | null> = {
  openai: null,
  tensorflow: null,
};

/**
 * Get an embedding provider instance
 */
export function getEmbeddingProvider(type: EmbeddingProviderType): EmbeddingProvider {
  const settings = getSettings();

  if (!providers[type]) {
    switch (type) {
      case "openai":
        if (!settings.currentProvider.apiKey) {
          throw new Error("OpenAI API key is required for embeddings");
        }
        providers[type] = new OpenAIEmbeddingProvider(settings.currentProvider.apiKey);
        break;

      case "tensorflow":
        providers[type] = new TensorflowEmbeddingProvider();
        break;

      default:
        throw new Error(`Unknown embedding provider type: ${type}`);
    }
  }

  return providers[type]!;
}

/**
 * Clear provider cache - useful for testing or when API keys change
 */
export function clearEmbeddingProviders(): void {
  Object.keys(providers).forEach((key) => {
    providers[key as EmbeddingProviderType] = null;
  });
}
