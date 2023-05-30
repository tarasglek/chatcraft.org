import { ChatOpenAI } from "langchain/chat_models/openai";

import { ChatCraftChat, SerializedChatCraftChat } from "./ChatCraftChat";
import { ChatCraftHumanMessage, ChatCraftSystemMessage } from "./ChatCraftMessage";

type ShareResponse = {
  message: string;
  url: string;
  id: string;
};

export async function createOrUpdateShare(user: User, token: string, chat: ChatCraftChat) {
  const res = await fetch(`/api/share/${user.username}/${chat.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(chat.serialize()),
  });

  const { message, url }: ShareResponse = await res.json();

  if (!res.ok) {
    throw new Error(`Unable to share chat: ${message || "unknown error"}`);
  }

  return url;
}

export async function loadShare(user: string, id: string) {
  const res = await fetch(`/api/share/${user}/${id}`);
  if (!res.ok) {
    throw new Error("Unable to load shared chat" + (await res.json()).message);
  }

  const serialized: SerializedChatCraftChat = await res.json();
  return ChatCraftChat.parse(serialized);
}

export async function summarizeChat(openaiApiKey: string, chat: ChatCraftChat) {
  const chatOpenAI = new ChatOpenAI({
    openAIApiKey: openaiApiKey,
    temperature: 0,
    modelName: "gpt-3.5-turbo",
  });

  const systemChatMessage = new ChatCraftSystemMessage({
    text: "You are expert at summarizing",
  });

  const summarizeInstruction = new ChatCraftHumanMessage({
    text: `Summarize this entire chat in 75 words or fewer. Respond only with the summary text`,
  });

  try {
    const res = await chatOpenAI.call([systemChatMessage, ...chat.messages, summarizeInstruction]);
    return res.text.trim();
  } catch (err) {
    console.error("Error summarizing chat", err);
    throw err;
  }
}
