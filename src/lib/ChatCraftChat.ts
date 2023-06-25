import { nanoid } from "nanoid";

import {
  ChatCraftAppMessage,
  ChatCraftMessage,
  ChatCraftSystemMessage,
  type SerializedChatCraftMessage,
} from "./ChatCraftMessage";
import { createShareUrl, createOrUpdateShare, deleteShare } from "./share";
import db, { type ChatCraftChatTable, type ChatCraftMessageTable } from "./db";
import summarize from "./summarize";
import { createSystemMessage } from "./system-prompt";

export type SerializedChatCraftChat = {
  id: string;
  date: string;
  shareUrl?: string;
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
  shareUrl?: string;
  private _summary?: string;
  private _messages: ChatCraftMessage[];
  readonly: boolean;

  constructor({
    id,
    date,
    shareUrl,
    summary,
    messages,
    readonly,
  }: {
    id?: string;
    date?: Date;
    shareUrl?: string;
    summary?: string;
    messages?: ChatCraftMessage[];
    readonly?: boolean;
  } = {}) {
    this.id = id ?? nanoid();
    this._messages = messages ?? [createSystemMessage()];
    this.date = date ?? new Date();
    // All chats are private by default, unless we add a shareUrl
    this.shareUrl = shareUrl;
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

  get summary() {
    return (
      this._summary ||
      createSummary(this.messages({ includeAppMessages: false, includeSystemMessages: false }))
    );
  }

  set summary(summary: string) {
    this._summary = summary;
  }

  async addMessage(message: ChatCraftMessage, user?: User) {
    if (this.readonly) {
      return;
    }

    this._messages.push(message);
    return this.update(user);
  }

  async removeMessage(id: string, user?: User) {
    if (this.readonly) {
      return;
    }

    await ChatCraftMessage.delete(id);
    this._messages = this._messages.filter((message) => message.id !== id);
    return this.update(user);
  }

  async resetMessages(user?: User) {
    if (this.readonly) {
      return;
    }

    // Delete existing messages from db
    await db.messages.bulkDelete(this._messages.map(({ id }) => id));
    // Make a new set of messages
    this._messages = [createSystemMessage()];
    // Update the db
    return this.update(user);
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

  // Make this chat public, and share online
  async share(user: User, summary?: string) {
    if (this.readonly) {
      return;
    }

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
    if (this.readonly) {
      return;
    }

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
    if (this.readonly) {
      return;
    }

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
      messages: this.messages({ includeAppMessages: false, includeSystemMessages: true }).map(
        (message) => message.serialize()
      ),
    };
  }

  toDB(): ChatCraftChatTable {
    return {
      id: this.id,
      date: this.date,
      shareUrl: this.shareUrl,
      summary: this.summary,
      // In the DB, we store the app messages, since that's what we show in the UI
      messageIds: this._messages.map(({ id }) => id),
    };
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
