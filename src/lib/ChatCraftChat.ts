import { nanoid } from "nanoid";

import {
  ChatCraftAppMessage,
  ChatCraftMessage,
  ChatCraftSystemMessage,
  type SerializedChatCraftMessage,
} from "./ChatCraftMessage";
import db, { type ChatCraftChatTable, type ChatCraftMessageTable } from "./db";
import summarize from "./summarize";
import { createSystemMessage } from "./system-prompt";
import { createShare, createShareUrl } from "./share";
import { SharedChatCraftChat } from "./SharedChatCraftChat";
import { countTokensInMessages } from "./ai";

export type SerializedChatCraftChat = {
  id: string;
  date: string;
  summary?: string;
  messages: SerializedChatCraftMessage[];
};

function createSummary(messages: ChatCraftMessage[], maxLength = 200) {
  const content = messages.map(({ text }) => text).join("\n\n");
  const summary = summarize(content);
  return summary.length > maxLength ? summary.slice(0, maxLength) + "..." : summary;
}

export class ChatCraftChat {
  id: string;
  date: Date;
  private _summary?: string;
  private _messages: ChatCraftMessage[];
  readonly: boolean;

  constructor({
    id,
    date,
    summary,
    messages,
    readonly,
  }: {
    id?: string;
    date?: Date;
    summary?: string;
    messages?: ChatCraftMessage[];
    readonly?: boolean;
  } = {}) {
    this.id = id ?? nanoid();
    this._messages = messages ?? [createSystemMessage()];
    this.date = date ?? new Date();
    // If the user provides a summary, use it, otherwise we'll generate something
    this._summary = summary;
    // When we load a chat remotely (from JSON vs. DB) readonly=true
    this.readonly = readonly === true;
  }

  /**
   * We store all message types, but they can be requested with or
   * without the ChatCraftAppMessages and ChatCraftSystemMessages. For
   * display and db, requesting with app messages is correct
   * (`chat.messages({ includeAppMessages: true })`. For serialization
   * or sending to an LLM, use `chat.messages({ includeAppMessages: false })`.
   */
  messages(
    options: { includeAppMessages?: boolean; includeSystemMessages?: boolean } = {
      includeAppMessages: true,
      includeSystemMessages: true,
    }
  ) {
    const includeAppMessages = options.includeAppMessages === true;
    const includeSystemMessages = options.includeSystemMessages === true;

    return this._messages.filter((message) => {
      if (!includeAppMessages && message instanceof ChatCraftAppMessage) {
        return false;
      }
      if (!includeSystemMessages && message instanceof ChatCraftSystemMessage) {
        return false;
      }
      return true;
    });
  }

  async tokens() {
    const messages = this.messages({ includeAppMessages: false, includeSystemMessages: true });
    return countTokensInMessages(messages);
  }

  get summary() {
    return (
      this._summary ||
      createSummary(this.messages({ includeAppMessages: false, includeSystemMessages: false }))
    );
  }

  set summary(summary: string) {
    this._summary = summary;
  }

  async addMessage(message: ChatCraftMessage) {
    if (this.readonly) {
      return;
    }

    this._messages.push(message);
    return this.save();
  }

  async removeMessage(id: string) {
    if (this.readonly) {
      return;
    }

    await ChatCraftMessage.delete(id);
    this._messages = this._messages.filter((message) => message.id !== id);
    return this.save();
  }

  async resetMessages() {
    if (this.readonly) {
      return;
    }

    // Delete existing messages from db
    await db.messages.bulkDelete(this._messages.map(({ id }) => id));
    // Make a new set of messages
    this._messages = [createSystemMessage()];
    // Update the db
    return this.save();
  }

  toMarkdown() {
    // Turn the messages into Markdown, with each message separated with an <hr />
    // Strip out the app messages.
    return this.messages({ includeAppMessages: false, includeSystemMessages: true })
      .map((message) => message.text)
      .join("\n\n---\n\n");
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
    if (this.readonly) {
      return;
    }

    const chatId = this.id;
    // Update the date to indicate we've update the chat
    this.date = new Date();

    await db.transaction("rw", db.chats, db.messages, async () => {
      // Upsert Messages in Chat first
      await db.messages.bulkPut(this._messages.map((message) => message.toDB(chatId)));

      // Upsert Chat itself
      await db.chats.put(this.toDB());
    });
  }

  // Create a new chat based on the messages in this one
  async fork(messageId?: string) {
    // Skip the app message
    let messages = this.messages({ includeAppMessages: false, includeSystemMessages: true });
    if (messageId) {
      const idx = messages.findIndex((message) => message.id === messageId);
      if (idx) {
        messages = messages.slice(idx);
      }
    }

    const chat = new ChatCraftChat({
      messages: messages.map((message) => message.clone()),
      summary: this.summary,
    });
    await chat.save();
    return chat;
  }

  clone() {
    // Generate a new `id` and `date` in the constructor
    return new ChatCraftChat({
      summary: this.summary,
      messages: this._messages,
      readonly: this.readonly,
    });
  }

  toJSON() {
    return this.serialize();
  }

  // Because ChatCraftMessage uses serialize() vs. toJSON(), do the same here
  serialize(): SerializedChatCraftChat {
    return {
      id: this.id,
      date: this.date.toISOString(),
      summary: this.summary,
      // In JSON, we strip out the app messages
      messages: this.messages({ includeAppMessages: false, includeSystemMessages: true }).map(
        (message) => message.serialize()
      ),
    };
  }

  toDB(): ChatCraftChatTable {
    return {
      id: this.id,
      date: this.date,
      summary: this.summary,
      // In the DB, we store the app messages, since that's what we show in the UI
      messageIds: this._messages.map(({ id }) => id),
    };
  }

  async share(user: User, summary?: string) {
    // Because shared chats are immutable, we'll give this chat its own
    // unique `id`, separate to the current one.
    const cloned = this.clone();
    // If we get a new summary, use that
    if (summary) {
      cloned.summary = summary;
    }

    // Generate a public share URL
    const shareUrl = createShareUrl(cloned, user);
    await createShare(cloned, user);

    const shared = new SharedChatCraftChat({
      id: cloned.id,
      url: shareUrl,
      date: cloned.date,
      summary: cloned.summary,
      chat: cloned,
    });

    // Cache this locally in our db as well
    await db.shared.add(shared.toDB());

    return shared;
  }

  static async delete(id: string) {
    const chat = await ChatCraftChat.find(id);
    if (chat) {
      await Promise.all(
        chat._messages.map((message) => {
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
  static fromJSON({ id, date, summary, messages }: SerializedChatCraftChat): ChatCraftChat {
    return new ChatCraftChat({
      id,
      date: new Date(date),
      summary,
      messages: messages.map((message) => ChatCraftMessage.fromJSON(message)),
      // We can't modify a chat loaded outside the db
      readonly: true,
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
