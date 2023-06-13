import { nanoid } from "nanoid";
import { BaseChatMessage, type MessageType } from "langchain/schema";
import db, { type ChatCraftMessageTable } from "./db";

export class ChatCraftAiMessageVersion {
  id: string;
  date: Date;
  model: GptModel;
  text: string;

  constructor({ date, model, text }: { date?: Date; model: GptModel; text: string }) {
    this.id = nanoid();
    this.date = date ?? new Date();
    this.model = model;
    this.text = text;
  }
}

export type SerializedChatCraftMessage = {
  id: string;
  date: string;
  type: MessageType;
  model?: GptModel;
  user?: User;
  text: string;
  versions?: ChatCraftAiMessageVersion[];
};

// A decorated langchain chat message, with extra metadata
export class ChatCraftMessage extends BaseChatMessage {
  id: string;
  date: Date;
  type: MessageType;

  constructor({
    id,
    date,
    type,
    text,
  }: {
    id?: string;
    date?: Date;
    type: MessageType;
    text: string;
  }) {
    super(text);

    this.id = id ?? nanoid();
    this.date = date ?? new Date();
    this.type = type;
  }

  // Comply with BaseChatMessage's need for _getType()
  _getType(): MessageType {
    return this.type;
  }

  static async delete(id: string) {
    return db.messages.delete(id);
  }

  // XXX: we can't use toJSON() because langchain depends on it
  serialize(): SerializedChatCraftMessage {
    return {
      id: this.id,
      date: this.date.toISOString(),
      type: this.type,
      text: this.text,
    };
  }

  // Parse from serialized JSON
  static parse(message: SerializedChatCraftMessage): ChatCraftMessage {
    switch (message.type) {
      case "ai":
        return ChatCraftAiMessage.parse(message);
      case "human":
        return ChatCraftHumanMessage.parse(message);
      case "system":
        return ChatCraftSystemMessage.parse(message);
      default:
        throw new Error(`Error parsing unknown message type: ${message.type}`);
    }
  }

  // Parse from db representation
  static fromDB(message: ChatCraftMessageTable): ChatCraftMessage {
    switch (message.type) {
      case "ai":
        return ChatCraftAiMessage.fromDB(message);
      case "human":
        return ChatCraftHumanMessage.fromDB(message);
      case "system":
        return ChatCraftSystemMessage.fromDB(message);
      default:
        throw new Error(`Error parsing unknown message type: ${message.type}`);
    }
  }
}

export class ChatCraftAiMessage extends ChatCraftMessage {
  model: GptModel;
  versions: ChatCraftAiMessageVersion[];

  constructor({
    id,
    date,
    model,
    text,
    versions,
  }: {
    id?: string;
    date?: Date;
    model: GptModel;
    text: string;
    versions?: ChatCraftAiMessageVersion[];
  }) {
    super({ id, date, type: "ai", text });

    this.model = model;
    this.versions = versions ?? [new ChatCraftAiMessageVersion({ date, model, text })];
  }

  switchVersion(id: string) {
    const version = this.versions.find((v) => v.id === id);
    if (!version) {
      throw new Error(`no such version: ${id}`);
    }

    const { date, model, text } = version;
    this.date = date;
    this.model = model;
    this.text = text;
    db.messages.update(this.id, { date, model, text });
  }

  // Get the first version that matches the current state of the message (there could be multiple)
  get currentVersion() {
    if (!this.versions?.length) {
      return null;
    }

    const { model, text, versions } = this;
    for (const version of versions) {
      if (version.model === model && version.text === text) {
        return version;
      }
    }

    return null;
  }

  serialize(): SerializedChatCraftMessage {
    return {
      id: this.id,
      date: this.date.toISOString(),
      type: this.type,
      model: this.model,
      text: this.text,
      versions: this.versions,
    };
  }

  static parse(message: SerializedChatCraftMessage) {
    return new ChatCraftAiMessage({
      id: message.id,
      date: new Date(message.date),
      model: message.model || "gpt-3.5-turbo",
      text: message.text,
      versions: message.versions,
    });
  }

  static fromDB(message: ChatCraftMessageTable) {
    return new ChatCraftAiMessage({
      id: message.id,
      date: message.date,
      model: message.model || "gpt-3.5-turbo",
      text: message.text,
      versions: message.versions,
    });
  }
}

export class ChatCraftHumanMessage extends ChatCraftMessage {
  user?: User;

  constructor({ id, date, user, text }: { id?: string; date?: Date; user?: User; text: string }) {
    super({ id, date, type: "human", text });

    this.user = user;
  }

  serialize(): SerializedChatCraftMessage {
    return {
      id: this.id,
      date: this.date.toISOString(),
      type: this.type,
      user: this.user,
      text: this.text,
    };
  }

  static parse(message: SerializedChatCraftMessage) {
    return new ChatCraftHumanMessage({
      id: message.id,
      date: new Date(message.date),
      user: message.user,
      text: message.text,
    });
  }

  static fromDB(message: ChatCraftMessageTable) {
    return new ChatCraftHumanMessage({
      id: message.id,
      date: message.date,
      user: message.user,
      text: message.text,
    });
  }
}

export class ChatCraftSystemMessage extends ChatCraftMessage {
  constructor({ id, date, text }: { id?: string; date?: Date; text: string }) {
    super({ id, date, type: "system", text });
  }

  static parse(message: SerializedChatCraftMessage) {
    return new ChatCraftSystemMessage({
      id: message.id,
      date: new Date(message.date),
      text: message.text,
    });
  }

  static fromDB(message: ChatCraftMessageTable) {
    return new ChatCraftSystemMessage({
      id: message.id,
      date: message.date,
      text: message.text,
    });
  }
}

export const ApiKeyInstructionsText = `I am a helpful assistant, but before I can help, you need to enter an
 [OpenAI API Key](https://platform.openai.com/account/api-keys) below. Here's an example of what
 an API Key looks like:

 \`sk-tVqEo67MxnfAAPQ68iuVT#ClbkFJkUz4oUblcvyUUxrg4T0\`
 
 Please enter your API Key in the form below to begin chatting!
`;

export const AiGreetingText = "I am a helpful assistant! How can I help?";
