import { describe, test, expect } from "vitest";

import summarize from "./summarize";

describe("summarize()", () => {
  test("Single sentence", () => {
    const text = "This is a single sentence.";
    expect(summarize(text)).toEqual(text);
  });

  test("Summary returns top 3 sentences by default", () => {
    const text =
      "This is the first sentence. This is the second sentence. This is the third sentence. This is the fourth sentence.";
    expect(summarize(text)).toEqual(
      "This is the first sentence. This is the second sentence. This is the third sentence."
    );
  });

  test("Summary returns top n sentences when value is passed", () => {
    const text =
      "This is the first sentence. This is the second sentence. This is the third sentence. This is the fourth sentence.";
    expect(summarize(text, 2)).toEqual("This is the first sentence. This is the second sentence.");
  });

  test("Wikipedia paragraphs summary", () => {
    const text = `
A large language model (LLM) is a language model characterized by its large size.
Its size is enabled by AI accelerators, which are able to process vast amounts of 
text data, mostly scraped from the Internet. LLMs are artificial neural networks 
which can contain a billion to trillions of weights, and are (pre-)trained using 
self-supervised learning and semi-supervised learning. Transformer architecture contributed 
to faster training. Alternative architectures include the mixture of experts (MoE), 
which has been proposed by Google, starting with sparsely-gated ones in 2017, Gshard 
in 2021 to GLaM in 2022.

As language models, they work by taking an input text and repeatedly predicting the 
next token or word. Up to 2020, fine tuning was the only way a model could be 
adapted to be able to accomplish specific tasks. Larger sized models, such as GPT-3, 
however, can be prompt-engineered to achieve similar results. They are thought to 
acquire embodied knowledge about syntax, semantics and "ontology" inherent in human 
language corpora, but also inaccuracies and biases present in the corpora.
    
Notable examples include OpenAI's GPT models (e.g., GPT-3.5 and GPT-4, used in ChatGPT),
Google's PaLM (used in Bard), and Meta's LLaMa, as well as BLOOM, Ernie 3.0 Titan, 
and Claude.`;

    const summary = `Notable examples include OpenAI's GPT models (e.g., GPT-3.5 and GPT-4, used in ChatGPT), Google's PaLM (used in Bard), and Meta's LLaMa, as well as BLOOM, Ernie 3.0 Titan, and Claude. Alternative architectures include the mixture of experts (MoE), which has been proposed by Google, starting with sparsely-gated ones in 2017, Gshard in 2021 to GLaM in 2022. They are thought to acquire embodied knowledge about syntax, semantics and "ontology" inherent in human language corpora, but also inaccuracies and biases present in the corpora.`;

    expect(summarize(text)).toEqual(summary);
  });

  test("Markdown is ignored", () => {
    const text = `
# ChatCraft.org

Welcome to [ChatCraft.org](https://chatcraft.org), your open-source web companion for coding
with Large Language Models (LLMs). Designed with developers in mind, ChatCraft transforms the
way you interact with GPT models, making it effortless to read, write, debug, and enhance
your code.
    
Whether you're exploring new designs or learning about the latest technologies, ChatCraft
is your go-to platform. With a user interface inspired by GitHub, and editable Markdown
everywhere, you'll feel right at home from the get-go.
    
![ChatCraft UI Example](docs/chatcraft-example.png)`;

    const summary = `Designed with developers in mind, ChatCraft transforms the way you interact with GPT models, making it effortless to read, write, debug, and enhance your code. With a user interface inspired by GitHub, and editable Markdown everywhere, you'll feel right at home from the get-go. ChatCraft.org Welcome to ChatCraft.org, your open-source web companion for coding with Large Language Models (LLMs).`;

    expect(summarize(text)).toEqual(summary);
  });

  test("Markdown with code ignores code", () => {
    const text = `
How do I write hello world in JavaScript?

---

In JavaScript, you write hello world like this:

\`\`\`js
console.log('hello world')
\`\`\`
`;

    const summary = `In JavaScript, you write hello world like this: console.log('hello world') How do I write hello world in JavaScript?`;

    expect(summarize(text)).toEqual(summary);
  });
});
