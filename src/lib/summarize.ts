/**
 * Naive summarization algorithm. Likely there is something better,
 * but this is good enough to start.
 *
 * TS rewrite of https://github.com/jbrooksuk/node-summary/tree/browser
 * and https://gist.github.com/SpiffGreen/e163579bfe9ac1f391b2efce9e95c7c5#file-text_summarization_algorithm-js
 * Used under MIT License - https://jbrooksuk.mit-license.org/
 */

type SentencesDict = {
  [key: string]: number;
};

function dedupe(collection: string[]) {
  return [...new Set(collection)];
}

function splitContentToSentences(content: string): string[] {
  if (content.indexOf(".") === -1) {
    return [];
  }

  content = content.replace("\n", ". ");
  return content.match(/(.+?\.(?:\s|$))/g) ?? [];
}

function splitContentToParagraphs(content: string): string[] {
  return content.split("\n\n");
}

function sentencesIntersection(sent1: string, sent2: string): number {
  // Split sentences into words/tokens
  const s1 = new Set(sent1.split(" "));
  const s2 = new Set(sent2.split(" "));

  if (s1.size + s2.size === 0) {
    return 0;
  }

  // Normalize the result by the average number of words
  const intersection = new Set([...s1].filter((i) => s2.has(i)));
  return intersection.size / ((s1.size + s2.size) / 2);
}

function formatSentence(sentence: string): string {
  // To support unicode characters.
  // http://www.unicode.org/reports/tr29/WordBreakTest.html
  const re = /[\p{L}\p{M}\p{N}\p{Pc}]+/gu;
  return sentence.replace(re, "");
}

function getBestSentence(paragraph: string, sentences_dict: SentencesDict): string {
  const sentences = splitContentToSentences(paragraph);
  if (sentences.length < 2) return "";

  let bestSentence = "";
  let maxValue = 0;
  for (const s in sentences) {
    const sentence = sentences[s];
    const strip_s = formatSentence(sentence);
    if (strip_s && sentences_dict[strip_s] > maxValue) {
      maxValue = sentences_dict[strip_s];
      bestSentence = sentence;
    }
  }

  return bestSentence;
}

function getSentencesRanks(content: string): SentencesDict {
  const sentences = splitContentToSentences(content);
  const n = sentences.length;

  // This is ugly, I know.
  const values = [];
  let _val = [];
  for (let i = 0; i < n; i++) {
    _val = [];
    for (let j = 0; j < n; j++) {
      _val.push(0);
    }
    values.push(_val);
  }

  // Assign each score to each sentence
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const intersection = sentencesIntersection(sentences[i], sentences[j]);
      values[i][j] = intersection;
    }
  }

  // Build sentence score dictionary
  const sentences_dict: SentencesDict = {};
  let score = 0;
  for (let i = 0; i < n; i++) {
    score = 0;
    for (let j = 0; j < n; j++) {
      if (i !== j) score += values[i][j];
    }

    const strip_s = formatSentence(sentences[i]);
    sentences_dict[strip_s] = score;
  }

  return sentences_dict;
}

export default function summarize(content: string) {
  const summarySentences: string[] = [];
  const dict = getSentencesRanks(content);
  const paragraphs = splitContentToParagraphs(content);

  for (const paragraph of paragraphs) {
    const best = getBestSentence(paragraph.trim(), dict);
    if (best) {
      summarySentences.push(best);
    }
  }

  return summarySentences.length ? dedupe(summarySentences).join(" ") : content;
}
