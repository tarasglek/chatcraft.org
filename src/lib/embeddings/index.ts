import { EmbeddingsProvider } from "./EmbeddingProvider";
import { OpenAIEmbeddingsProvider } from "./OpenAIEmbedding";
import { TensorflowEmbeddingsProvider } from "./TensorflowEmbedding";
import { getSettings } from "../settings";

/**
 * Supported embedding provider types
 */
export type EmbeddingsProviderType = "openai" | "tensorflow";

export const EMBEDDINGS_PROVIDER_CONFIG = {
  openai: OpenAIEmbeddingsProvider.CONFIG,
  tensorflow: TensorflowEmbeddingsProvider.CONFIG,
};

const providers: Record<EmbeddingsProviderType, EmbeddingsProvider | null> = {
  openai: null,
  tensorflow: null,
};

/**
 * Get an embedding provider instance
 */
export function getEmbeddingsProvider(type: EmbeddingsProviderType): EmbeddingsProvider {
  const settings = getSettings();

  if (!providers[type]) {
    switch (type) {
      case "openai":
        if (!settings.currentProvider.apiKey) {
          throw new Error("OpenAI API key is required for embeddings");
        }
        providers[type] = new OpenAIEmbeddingsProvider(settings.currentProvider.apiKey);

        break;

      case "tensorflow":
        providers[type] = new TensorflowEmbeddingsProvider();
        break;

      default:
        throw new Error(`Unknown embedding provider type: ${type}`);
    }

    settings.embeddingsBatchSize = providers[type].defaultBatchSize;
  }

  return providers[type];
}

/**
 * Clear provider cache - useful for testing or when API keys change
 */
export function clearEmbeddingProviders(): void {
  Object.keys(providers).forEach((key) => {
    providers[key as EmbeddingsProviderType] = null;
  });
}
