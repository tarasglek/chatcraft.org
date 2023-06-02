import { nanoid } from "nanoid";

import {
  ChatCraftAiMessage,
  ChatCraftMessage,
  AiGreetingText,
  type SerializedChatCraftMessage,
} from "./ChatCraftMessage";
import { createShareUrl, createOrUpdateShare } from "./share";
import db from "./db";

import type { ChatCraftMessageTable } from "./db";
import summarize from "./summarize";

export type SerializedChatCraftChat = {
  id: string;
  date: Date;
  shareUrl?: string;
  summary: string;
  messages: SerializedChatCraftMessage[];
};

function createSummary(messages: ChatCraftMessage[]) {
  const content = messages.map(({ text }) => text).join("\n\n");
  return summarize(content);
}

export class ChatCraftChat {
  id: string;
  date: Date;
  shareUrl?: string;
  summary: string;
  messages: ChatCraftMessage[];

  constructor({
    id,
    date,
    shareUrl,
    summary,
    messages,
  }: {
    id?: string;
    date?: Date;
    shareUrl?: string;
    summary?: string;
    messages?: ChatCraftMessage[];
  } = {}) {
    this.id = id ?? nanoid();
    this.messages = messages ?? [
      new ChatCraftAiMessage({
        text: AiGreetingText,
        model: "gpt-3.5-turbo",
      }),
    ];
    this.date = date ?? new Date();
    // All chats are private by default, unless we add a shareUrl
    this.shareUrl = shareUrl;
    this.summary = summary ?? createSummary(this.messages);
  }

  summarize() {
    return createSummary(this.messages);
  }

  async addMessage(message: ChatCraftMessage) {
    this.messages.push(message);
    return this.update();
  }

  async removeMessage(id: string) {
    this.messages = this.messages.filter((message) => message.id !== id);
    return this.update();
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

    // Return a new ChatCraftChat object for this chat/messages, skipping any
    // that were not found (e.g., user deleted)
    return ChatCraftChat.parse({
      ...chat,
      messages: messages.filter((message): message is ChatCraftMessageTable => !!message),
    });
  }

  // Save to db
  async save() {
    const chatId = this.id;
    // Update the date to indicate we've update the chat
    this.date = new Date();
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
          date: this.date,
          shareUrl: this.shareUrl,
          summary: this.summary,
          messageIds,
        },
        chatId
      );
    });
  }

  // Make this chat public, and share online
  async share() {
    // Update db to indicate this is public, if necessary
    if (!this.shareUrl) {
      this.shareUrl = createShareUrl(this);
      await this.save();
    }

    return createOrUpdateShare(this);
  }

  // Combine saving to db and updating online share if necessary
  async update() {
    // If this chat is already shared, do both.
    if (this.shareUrl) {
      return Promise.all([this.save(), this.share()]);
    } else {
      // Otherwise only update db
      return this.save();
    }
  }

  // Create a new chat based on the messages in this one
  async fork(messageId?: string) {
    let messages = this.messages;
    if (messageId) {
      const idx = messages.findIndex((message) => message.id === messageId);
      if (idx) {
        messages = messages.slice(idx);
      }
    }

    const chat = new ChatCraftChat({
      messages: [...messages],
      summary: this.summary,
    });
    await chat.save();
    return chat;
  }

  toJSON() {
    return this.serialize();
  }

  // Because ChatCraftMessage uses serialize() vs. toJSON(), do the same here
  serialize(): SerializedChatCraftChat {
    return {
      id: this.id,
      date: this.date,
      shareUrl: this.shareUrl,
      summary: this.summary,
      messages: this.messages.map((message) => message.serialize()),
    };
  }

  static parse({ id, date, shareUrl, summary, messages }: SerializedChatCraftChat): ChatCraftChat {
    return new ChatCraftChat({
      id,
      date,
      shareUrl,
      summary,
      messages: messages.map((message) => ChatCraftMessage.parse(message)),
    });
  }
}
