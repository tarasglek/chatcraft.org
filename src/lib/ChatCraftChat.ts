import { uuid } from "./utils";
import {
  ChatCraftAiMessage,
  ChatCraftMessage,
  type SerializedChatCraftMessage,
} from "./ChatCraftMessage";
import { createOrUpdateShare } from "./share";
import db from "./db";

import type { ChatCraftMessageTable } from "./db";
import { getToken, getUser } from "./storage";
import summarize from "./summarize";

// We store ChatCraft Chats as flat JSON
export type SerializedChatCraftChat = {
  id: string;
  version: string;
  date: number;
  isPublic: boolean;
  summary?: string;
  messages: SerializedChatCraftMessage[];
};

function createSummary(messages: ChatCraftMessage[]) {
  const content = messages.map(({ text }) => text).join("\n\n");
  return summarize(content);
}

export class ChatCraftChat {
  id: string;
  version: string;
  date: number;
  isPublic: boolean;
  summary: string;
  messages: ChatCraftMessage[];

  constructor({
    id,
    version,
    date,
    isPublic,
    summary,
    messages,
  }: {
    id?: string;
    version?: string;
    date?: number;
    isPublic?: boolean;
    summary?: string;
    messages?: ChatCraftMessage[];
  } = {}) {
    this.id = id ?? uuid();
    this.messages = messages ?? [
      new ChatCraftAiMessage({ text: "What can I help you do?", model: "gpt-3.5-turbo" }),
    ];
    this.version = version ?? "1";
    this.date = date ?? Date.now();
    // All chats are private by default
    this.isPublic = isPublic ?? false;
    this.summary = summary ?? createSummary(this.messages);
  }

  async addMessage(message: ChatCraftMessage) {
    this.messages.push(message);
    this.summary = createSummary(this.messages);
    return this.save();
  }

  async removeMessage(id: string) {
    this.messages = this.messages.filter((message) => message.id !== id);
    this.summary = createSummary(this.messages);
    return this.save();
  }

  // Find in db - return
  static async find(id: string) {
    // Get the chat itself
    const chat = await db.chats.get(id);
    if (!chat) {
      return;
    }

    // Rehydrate the messages from their IDs
    const messages = await db.messages.bulkGet(chat.messageIds);
    if (!messages?.length) {
      throw new Error("unable to get messages associated with chat");
    }

    // Return a new ChatCraftChat object for this chat/messages
    return ChatCraftChat.parse({
      ...chat,
      messages: messages.filter((message): message is ChatCraftMessageTable => !!message),
    });
  }

  // Save to db
  async save() {
    const chatId = this.id;
    const messageIds = this.messages.map(({ id }) => id);

    await db.transaction("rw", db.chats, db.messages, async () => {
      // Upsert Messages in Chat first
      await db.messages.bulkPut(
        this.messages.map((message) => ({ ...message.serialize(), chatId }))
      );

      // Upsert Chat itself
      await db.chats.put(
        {
          id: this.id,
          version: this.version,
          date: this.date,
          isPublic: this.isPublic,
          summary: this.summary,
          messageIds,
        },
        chatId
      );
    });
  }

  // Create a new chat based on the messages in this one
  async fork() {
    const chat = new ChatCraftChat({
      messages: [...this.messages],
      summary: this.summary,
    });
    await chat.save();
    return chat;
  }

  // Make this chat public, and share online
  async share() {
    // Update db to indicate this is public, if necessary
    if (!this.isPublic) {
      this.isPublic = true;
      await this.save();
    }

    // Send over network
    const token = getToken();
    const user = getUser();
    if (!(user && token)) {
      throw new Error("missing user, token necessary for sharing");
    }
    return createOrUpdateShare(user, token, this);
  }

  toJSON() {
    return this.serialize();
  }

  // Because ChatCraftMessage uses serialize() vs. toJSON(), do the same here
  serialize(): SerializedChatCraftChat {
    return {
      id: this.id,
      version: this.version,
      date: this.date,
      isPublic: this.isPublic,
      summary: this.summary,
      messages: this.messages.map((message) => message.serialize()),
    };
  }

  static parse({
    id,
    version,
    date,
    isPublic,
    summary,
    messages,
  }: SerializedChatCraftChat): ChatCraftChat {
    return new ChatCraftChat({
      id,
      version,
      date,
      isPublic,
      summary,
      messages: messages.map((message) => ChatCraftMessage.parse(message)),
    });
  }
}
