import { nanoid } from "nanoid";

import {
  ChatCraftAppMessage,
  ChatCraftMessage,
  AiGreetingText,
  type SerializedChatCraftMessage,
} from "./ChatCraftMessage";
import { createShareUrl, createOrUpdateShare, deleteShare } from "./share";
import db, { type ChatCraftChatTable, type ChatCraftMessageTable } from "./db";
import summarize from "./summarize";

export type SerializedChatCraftChat = {
  id: string;
  date: string;
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
      new ChatCraftAppMessage({
        text: AiGreetingText,
      }),
    ];
    this.date = date ?? new Date();
    // All chats are private by default, unless we add a shareUrl
    this.shareUrl = shareUrl;
    // Don't include app messages in summary
    this.summary = summary ?? createSummary(this.nonAppMessages);
  }

  /**
   * We have two ways to access the messages:
   *
   *  1. `.messages`, which is the entire list of messages
   *  2. `.nonAppMessages`, which is same list without app messages
   *
   * For display and db, `.messages` is good.  For serialization or
   * sending to an LLM, use `.nonAppMessages`.
   */
  get nonAppMessages() {
    return this.messages.filter((message) => !(message instanceof ChatCraftAppMessage));
  }

  summarize() {
    return createSummary(this.nonAppMessages);
  }

  async addMessage(message: ChatCraftMessage, user?: User) {
    this.messages.push(message);
    return this.update(user);
  }

  async removeMessage(id: string, user?: User) {
    await ChatCraftMessage.delete(id);
    this.messages = this.messages.filter((message) => message.id !== id);
    return this.update(user);
  }

  async resetMessages(user?: User) {
    // Delete existing messages from db
    await db.messages.bulkDelete(this.messages.map(({ id }) => id));
    // Make a new set of messages
    this.messages = [
      new ChatCraftAppMessage({
        text: AiGreetingText,
      }),
    ];
    // Update the db
    return this.update(user);
  }

  toMarkdown() {
    // Turn the messages into Markdown, with each message separated with an <hr />
    // Strip out the app messages.
    return this.nonAppMessages.map((message) => message.text).join("\n\n---\n\n");
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

    // Return a new ChatCraftChat object for this chat/messages, skipping any
    // that were not found (e.g., user deleted)
    return ChatCraftChat.fromDB(chat, messages);
  }

  // Save to db
  async save() {
    const chatId = this.id;
    // Update the date to indicate we've update the chat
    this.date = new Date();

    await db.transaction("rw", db.chats, db.messages, async () => {
      // Upsert Messages in Chat first
      await db.messages.bulkPut(this.messages.map((message) => message.toDB(chatId)));

      // Upsert Chat itself
      await db.chats.put(this.toDB());
    });
  }

  // Make this chat public, and share online
  async share(user: User, summary?: string) {
    let isDirty = false;

    // Update db to indicate this is public, if necessary
    if (!this.shareUrl) {
      this.shareUrl = createShareUrl(this, user);
      isDirty = true;
    }

    // If we are given a custom summary, add it too
    if (summary) {
      this.summary = summary;
      isDirty = true;
    }

    // Update record for this in db if necessary
    if (isDirty) {
      await this.save();
    }

    return createOrUpdateShare(this, user);
  }

  async unshare(user: User) {
    // If this chat isn't already shared, we're done
    if (!this.shareUrl) {
      return;
    }

    await deleteShare(this, user);
    delete this.shareUrl;
    return this.save();
  }

  // Combine saving to db and updating online share if necessary
  async update(user?: User) {
    // If this chat is already shared, do both.
    if (this.shareUrl) {
      await this.save();
      if (user) {
        this.share(user);
      }
    } else {
      // Otherwise only update db
      return this.save();
    }
  }

  // Create a new chat based on the messages in this one
  async fork(messageId?: string) {
    // Skip the app message
    let messages = this.nonAppMessages;
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
      date: this.date.toISOString(),
      shareUrl: this.shareUrl,
      summary: this.summary,
      // In JSON, we strip out the app messages
      messages: this.nonAppMessages.map((message) => message.serialize()),
    };
  }

  toDB(): ChatCraftChatTable {
    return {
      id: this.id,
      date: this.date,
      shareUrl: this.shareUrl,
      summary: this.summary,
      // In the DB, we store the app messages, since that's what we show in the UI
      messageIds: this.messages.map(({ id }) => id),
    };
  }

  static async delete(id: string) {
    const chat = await ChatCraftChat.find(id);
    if (chat) {
      await Promise.all(
        chat.messages.map((message) => {
          try {
            ChatCraftMessage.delete(message.id);
          } catch (_) {
            /* empty */
          }
        })
      );
      return db.chats.delete(id);
    }
  }

  // Parse from serialized JSON
  static fromJSON({
    id,
    date,
    shareUrl,
    summary,
    messages,
  }: SerializedChatCraftChat): ChatCraftChat {
    return new ChatCraftChat({
      id,
      date: new Date(date),
      shareUrl,
      summary,
      messages: messages.map((message) => ChatCraftMessage.fromJSON(message)),
    });
  }

  // Parse from db representation, where chat and messages are separate.
  // Assumes all messages have already been obtained for messageIds, but
  // deals with any that are missing (undefined)
  static fromDB(chat: ChatCraftChatTable, messages: (ChatCraftMessageTable | undefined)[]) {
    return new ChatCraftChat({
      ...chat,
      messages: messages
        .filter((message): message is ChatCraftMessageTable => !!message)
        .map((message) => ChatCraftMessage.fromDB(message)),
    });
  }
}
