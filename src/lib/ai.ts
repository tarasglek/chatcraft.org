import { ChatOpenAI } from "langchain/chat_models/openai";
import { CallbackManager } from "langchain/callbacks";

import { ChatCraftMessage, ChatCraftSystemMessage } from "./ChatCraftMessage";
import { createSystemMessage } from "./system-prompt";

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
