import { ChatOpenAI } from "langchain/chat_models/openai";
import { CallbackManager } from "langchain/callbacks";

import { ChatCraftMessage, ChatCraftSystemMessage } from "./ChatCraftMessage";
import { createSystemMessage } from "./system-prompt";
import { getSettings } from "./settings";

import type { Tiktoken } from "tiktoken/lite";
import { ChatCraftModel } from "./ChatCraftModel";

export type ChatOptions = {
  apiKey: string;
  model: string;
  temperature?: number;
  onToken: (token: string, currentText: string) => void;
  controller?: AbortController;
};

// TODO: figure out how to consolidate this with the code in hooks/use-chat-openai.ts
// or replace that with this.
export const chat = (messages: ChatCraftMessage[], options: ChatOptions) => {
  const buffer: string[] = [];
  const chatOpenAI = new ChatOpenAI({
    openAIApiKey: options.apiKey,
    temperature: options.temperature ?? 0,
    streaming: true,
    modelName: options.model,
  });

  // Allow the stream to be cancelled
  const controller = options.controller ?? new AbortController();

  // Send the chat's messages and prefix with a system message unless
  // the user has already included their own custom system message.
  const messagesToSend =
    messages[0] instanceof ChatCraftSystemMessage ? messages : [createSystemMessage(), ...messages];

  return chatOpenAI
    .call(
      messagesToSend,
      {
        options: { signal: controller.signal },
      },
      CallbackManager.fromHandlers({
        handleLLMNewToken(token: string) {
          buffer.push(token);
          options.onToken(token, buffer.join(""));
        },
      })
    )
    .then(({ text }) => text);
};

export async function queryOpenAiModels(apiKey: string) {
  const res = await fetch("https://api.openai.com/v1/models", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error?.message ?? `error querying API`);
  }

  const { data } = await res.json();

  // Hide all pinned models (visual noise) except gpt-3.5-turbo-0613 as that wont be default till June 27 :(
  return data
    .filter(
      (model: any) =>
        model.id.includes("gpt") && (model.id == "gpt-3.5-turbo-0613" || !/\d{4}$/.test(model.id))
    )
    .map((model: any) => model.id) as string[];
}

export async function validateOpenAiApiKey(apiKey: string) {
  return !!(await queryOpenAiModels(apiKey));
}

// Cache this instance on first use
let encoding: Tiktoken;

export const countTokens = async (text: string) => {
  if (!encoding) {
    // Warn if this happens when it shouldn't. The UI should only
    // be calling `countTokens()` if we have the setting enabled
    if (!getSettings().countTokens) {
      console.trace("Unexpected call to countTokens() when settings.countTokens not set");
    }

    // We don't bundle these, but load them dynamically at runtime if needed due to size
    const { Tiktoken } = await import("tiktoken/lite");
    const cl100k_base = await import("tiktoken/encoders/cl100k_base.json");
    encoding = new Tiktoken(cl100k_base.bpe_ranks, cl100k_base.special_tokens, cl100k_base.pat_str);
  }

  return encoding.encode(text).length;
};

export const countTokensInMessages = async (messages: ChatCraftMessage[]) => {
  const counts = await Promise.all<number>(messages.map((message) => message.tokens()));
  return counts.reduce((total, current) => total + current, 0);
};

// See https://openai.com/pricing
export const calculateTokenCost = (tokens: number, model: ChatCraftModel) => {
  // Pricing is per 1,000 tokens
  tokens = tokens / 1000;

  if (model.id.startsWith("gpt-4")) {
    return tokens * 0.06;
  }

  if (model.id.startsWith("gpt-3.5")) {
    return tokens * 0.002;
  }

  console.warn(`Unknown pricing for model ${model.toString()}`);
  return 0;
};
