import { get_encoding } from "tiktoken";

// Cache to avoid recreation
const tokenizerCache = new Map<string, any>();

export function getTokenizer(model: string = "text-embedding-3-small") {
  const encodingName = "cl100k_base";
  if (!tokenizerCache.has(model)) {
    try {
      const encoder = get_encoding(encodingName);
      tokenizerCache.set(encodingName, encoder);
    } catch (err) {
      console.error("Failed to load tokenizer:", err);
      throw new Error("Failed to initialize tokenizer");
    }
  }

  return tokenizerCache.get(encodingName);
}

export function countTokens(text: string): number {
  if (!text) return 0;

  const tokenizer = getTokenizer();
  const tokens = tokenizer.encode(text);
  return tokens.length;
}

// Split text into tokens
export function tokenize(text: string): number[] {
  if (!text) return [];

  const tokenizer = getTokenizer();
  return tokenizer.encode(text);
}

// Convert tokens back to text
export function detokenize(tokens: number[]): string {
  if (!tokens || tokens.length === 0) return "";

  const tokenizer = getTokenizer();
  return tokenizer.decode(tokens);
}

export function cleanupTokenizers(): void {
  for (const tokenizer of tokenizerCache.values()) {
    tokenizer.free();
  }
  tokenizerCache.clear();
}

// Cleanup on unload
if (typeof window !== "undefined") {
  window.addEventListener("unload", cleanupTokenizers);
}
