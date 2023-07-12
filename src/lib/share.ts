import { ChatOpenAI } from "langchain/chat_models/openai";

import { ChatCraftChat, SerializedChatCraftChat } from "./ChatCraftChat";
import { ChatCraftHumanMessage, ChatCraftSystemMessage } from "./ChatCraftMessage";

export function createShareUrl(chat: ChatCraftChat, user: User) {
  // Create a share URL we can give to other people
  const { origin } = new URL(location.href);
  const shareUrl = new URL(`/c/${user.username}/${chat.id}`, origin);

  return shareUrl.href;
}

export async function createShare(chat: ChatCraftChat, user: User) {
  const res = await fetch(`/api/share/${user.username}/${chat.id}`, {
    method: "PUT",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(chat.serialize()),
  });

  if (!res.ok) {
    const {
      message,
    }: {
      message?: string;
    } = await res.json();
    throw new Error(`Unable to share chat: ${message || "unknown error"}`);
  }
}

export async function loadShare(user: string, id: string) {
  // We don't need to send credentials for this request
  const res = await fetch(`/api/share/${user}/${id}`);
  if (!res.ok) {
    throw new Error("Unable to load shared chat" + (await res.json()).message);
  }

  const serialized: SerializedChatCraftChat = await res.json();
  return ChatCraftChat.fromJSON(serialized);
}

export async function summarizeChat(openaiApiKey: string, chat: ChatCraftChat) {
  const chatOpenAI = new ChatOpenAI({
    openAIApiKey: openaiApiKey,
    temperature: 0,
    modelName: "gpt-3.5-turbo",
  });

  const systemChatMessage = new ChatCraftSystemMessage({
    text: "You are an expert at writing short summaries.",
  });

  const summarizeInstruction = new ChatCraftHumanMessage({
    text: `Summarize this chat in 25 words or fewer. Respond only with the summary text and focus on the main content, not mentioning the process or participants. For example: "Using a React context and hook to keep track of user state after login."`,
  });

  try {
    const messages = chat.messages({ includeAppMessages: false, includeSystemMessages: false });
    const res = await chatOpenAI.call([systemChatMessage, ...messages, summarizeInstruction]);
    return res.text.trim();
  } catch (err) {
    console.error("Error summarizing chat", err);
    throw err;
  }
}

export async function deleteShare(user: User, chatId: string) {
  const res = await fetch(`/api/share/${user.username}/${chatId}`, {
    method: "DELETE",
    credentials: "same-origin",
  });

  if (!res.ok) {
    const {
      message,
    }: {
      message?: string;
    } = await res.json();
    throw new Error(`Unable to unshare chat: ${message || "unknown error"}`);
  }
}
