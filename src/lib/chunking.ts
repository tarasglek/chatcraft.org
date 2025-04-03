import { FileChunk } from "./ChatCraftFile";

// For now only `paragraph` implementation works
export type ChunkingStrategy = "paragraph" | "fixed-size" | "sentence";

export interface ChunkingOptions {
  strategy: ChunkingStrategy; // Strategy: only `paragraph` works
  chunkSize?: number; // For fixed-size, characters or tokens
  overlapSize?: number; // Absolute overlap size
  overlapPercentage?: number; // Alternative: overlap as percentage of chunkSize
  preserveNewlines?: boolean; // Whether to preserve newlines in output chunks
}

// Default chunking options, following OpenAI's recommendations
export const DEFAULT_CHUNKING_OPTIONS: ChunkingOptions = {
  strategy: "paragraph",
  overlapPercentage: 25, // default is 20, but I want to use 25 for now (we may change it later)
  preserveNewlines: true,
};

/**
 * Chunks text based on specified strategy and options
 */
export function chunkText(
  text: string,
  options: ChunkingOptions = DEFAULT_CHUNKING_OPTIONS
): FileChunk[] {
  const opts = { ...DEFAULT_CHUNKING_OPTIONS, ...options };
  return chunkByParagraph(text, opts);
}

function chunkByParagraph(text: string, options: ChunkingOptions): FileChunk[] {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: FileChunk[] = [];

  let currentChunk = "";
  let startParagraph = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];

    if (!paragraph.trim()) continue;

    if (currentChunk) currentChunk += options.preserveNewlines ? "\n\n" : " ";
    currentChunk += paragraph;

    if (isBreakPoint(paragraph) || i === paragraphs.length - 1) {
      chunks.push({
        text: currentChunk,
        embeddings: [], // will be filled in stage 3
        metadata: {
          startParagraph,
          endParagraph: i,
          strategy: "paragraph",
        },
      });

      // overlap for next chunk
      const overlapParagraphs = calculateOverlap(options, i - startParagraph);
      startParagraph = Math.max(i - overlapParagraphs, 0);

      // next chunk with overlap paragraphs
      currentChunk = "";
      for (let j = startParagraph; j <= i; j++) {
        if (currentChunk) currentChunk += options.preserveNewlines ? "\n\n" : " ";
        currentChunk += paragraphs[j];
      }
    }
  }

  return chunks;
}

/**
 * Helper to determine if a paragraph represents a good break point
 */
function isBreakPoint(paragraph: string): boolean {
  return (
    paragraph.endsWith(".") ||
    paragraph.endsWith("!") ||
    paragraph.endsWith("?") ||
    paragraph.length > 500
  );
}

function calculateOverlap(options: ChunkingOptions, chunkSize: number): number {
  if (options.overlapSize !== undefined) {
    return options.overlapSize;
  }

  if (options.overlapPercentage !== undefined) {
    return Math.max(1, Math.floor((options.overlapPercentage / 100) * chunkSize));
  }

  return 1;
}
