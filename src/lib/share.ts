import { ChatOpenAI } from "langchain/chat_models/openai";

import { ChatCraftChat } from "./ChatCraftChat";
import { ChatCraftHumanMessage, ChatCraftSystemMessage } from "./ChatCraftMessage";

type ShareResponse = {
  message: string;
  url: string;
  id: string;
};

export async function createShare(user: User, token: string, chat: ChatCraftChat) {
  const res = await fetch(`/api/share/${user.username}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(chat.serialize()),
  });

  const { message, id, url }: ShareResponse = await res.json();

  if (!res.ok) {
    throw new Error(`Unable to share chat: ${message || "unknown error"}`);
  }

  return { id, url };
}

export async function summarizeChat(openaiApiKey: string, chat: ChatCraftChat) {
  const chatOpenAI = new ChatOpenAI({
    openAIApiKey: openaiApiKey,
    temperature: 0,
    modelName: "gpt-3.5-turbo",
  });

  const systemChatMessage = new ChatCraftSystemMessage({
    text: "You are expert at summarizing conversations and responding in JSON",
  });

  const summarizeInstruction = new ChatCraftHumanMessage({
    text: `Summarize this entire conversation in 75 words or fewer and give it a title. Respond only with JSON of the form: {"summary": "...", "title": "..."}`,
  });

  try {
    const res = await chatOpenAI.call([systemChatMessage, ...chat.messages, summarizeInstruction]);
    const { title, summary } = JSON.parse(res.text.trim());
    return { title, summary };
  } catch (err) {
    console.error("Error summarizing chat", err);
    throw err;
  }
}
