import { nanoid } from "nanoid";

import { ChatCraftMessage, type SerializedChatCraftMessage } from "./ChatCraftMessage";

// We store ChatCraft Chats as flat JSON
export type SerializedChatCraftChat = {
  id: string;
  version: string;
  date: string;
  messages: SerializedChatCraftMessage[];
};

export class ChatCraftChat {
  id: string;
  version: string;
  date: string;
  messages: ChatCraftMessage[];

  constructor({
    id,
    version,
    date,
    messages,
  }: {
    id?: string;
    version?: string;
    date?: string;
    messages: ChatCraftMessage[];
  }) {
    this.id = id ?? nanoid();
    this.version = version ?? "1";
    this.date = date ?? new Date().toISOString();
    this.messages = messages;
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
      messages: this.messages.map((message) => message.serialize()),
    };
  }

  static parse({ id, version, date, messages }: SerializedChatCraftChat): ChatCraftChat {
    return new ChatCraftChat({
      id,
      version,
      date,
      messages: messages.map((message) => ChatCraftMessage.parse(message)),
    });
  }
}
