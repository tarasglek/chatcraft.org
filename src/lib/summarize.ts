import nlp from "compromise/one";
import removeMarkdown from "remove-markdown";

/**
 * Use a "Term Frequency-Inverse Document Frequency" (TF-IDF) algorithm to
 * create a basic summary of a piece of Markdown. This algorithm works by
 * determining the most important sentences in a text based on the frequency
 * of their terms.
 *
 * It works like this:
 *
 * 1. Tokenization: Break the text into sentences and the sentences into terms (i.e., words).
 * 2. Term Frequency (TF): For each sentence, calculate the frequency of each
 *    term. The frequency of a term in a sentence is the number of times it
 *    appears in the sentence divided by the total number of terms in the
 *    sentence.
 * 3. Inverse Document Frequency (IDF): For each term, calculate how many sentences
 *    it appears in. The IDF of a term is the logarithm of the total number of
 *    sentences divided by the number of sentences that contain the term.
 * 4. TF-IDF: For each sentence, calculate the TF-IDF for each term (which is
 *    the TF multiplied by the IDF), and sum them to get the sentence's score.
 * 5. Summarization: Select the top-scoring sentences to create the summary.
 *
 * @param markdown markdown text to summarize
 * @param summaryLength number of sentences to use in summary
 * @returns summary string
 */

export default function summarize(markdown: string, summaryLength = 3) {
  const plainText = markdownToPlainText(markdown);
  const { sentences, terms } = tokenize(plainText);
  const termFrequencies = calculateTermFrequencies(sentences, terms);
  const inverseDocumentFrequencies = calculateInverseDocumentFrequencies(sentences, terms);

  const sentenceScores = sentences.map((sentence) => {
    const sentenceTerms = nlp(sentence).terms().out("array");
    return sentenceTerms.reduce((score: number, term: string) => {
      return score + (termFrequencies[term] || 0) * (inverseDocumentFrequencies[term] || 0);
    }, 0);
  });

  return selectTopSentences(sentences, sentenceScores, summaryLength);
}

function markdownToPlainText(markdown: string) {
  // Strip Markdown and replace newlines and long runs of spaces
  // to produce a single string of plain text.
  return removeMarkdown(markdown).replace(/\r?\n/g, " ").replace(/ {2,}/g, " ");
}

export function tokenize(text: string) {
  const sentences: string[] = nlp(text)
    .json()
    .map((s: { text: string }) => s.text);
  const terms = nlp(text).terms().out("array");

  return { sentences, terms };
}
/**
 *
 * Tries to split the provided text into
 * an array of text chunks where
 * each chunk is composed of one or more sentences.
 * The function attempts to limit each chunk to maximim
 * preferred characters preferred, but the chunk limit may still exceed
 * if a single sentence's length is greater than the preferred character limit.
 *
 * @param text The text content that needs to be split into Chunks
 * @param maxCharsPerSentence Maximum number of characters preferred per chunk
 * @returns Array of text chunks
 */
export function getSentenceChunksFrom(text: string, maxCharsPerSentence: number = 4096): string[] {
  const { sentences } = tokenize(text);
  const chunks: string[] = [];

  let currentText = "";

  for (const sentence of sentences) {
    if (currentText.length + sentence.length < maxCharsPerSentence) {
      currentText += ` ${sentence}`;
    } else {
      if (currentText.length) {
        chunks.push(currentText);
      }

      currentText = sentence;
    }
  }

  if (currentText.length) {
    chunks.push(currentText);
    currentText = "";
  }

  return chunks;
}

function calculateTermFrequencies(sentences: string[], terms: string[]): Record<string, number> {
  const termFrequencies: Record<string, number> = {};
  for (const term of terms) {
    termFrequencies[term] =
      sentences.reduce((count, sentence) => {
        return count + (sentence.includes(term) ? 1 : 0);
      }, 0) / sentences.length;
  }
  return termFrequencies;
}

function calculateInverseDocumentFrequencies(
  sentences: string[],
  terms: string[]
): Record<string, number> {
  const inverseDocumentFrequencies: Record<string, number> = {};
  for (const term of terms) {
    const sentenceCount = sentences.filter((sentence) => sentence.includes(term)).length;
    inverseDocumentFrequencies[term] = Math.log(sentences.length / (1 + sentenceCount));
  }
  return inverseDocumentFrequencies;
}

function selectTopSentences(
  sentences: string[],
  sentenceScores: number[],
  summaryLength: number
): string {
  const sentenceScorePairs = sentences.map(
    (sentence, i) => [sentence, sentenceScores[i]] as [string, number]
  );
  sentenceScorePairs.sort((a, b) => b[1] - a[1]);
  return sentenceScorePairs
    .slice(0, summaryLength)
    .map((pair) => pair[0])
    .join(" ");
}
