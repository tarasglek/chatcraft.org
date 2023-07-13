import { nanoid } from "nanoid";
import { AIMessage, HumanMessage, SystemMessage, type MessageType } from "langchain/schema";
import db, { type ChatCraftMessageTable } from "./db";
import { ChatCraftModel } from "./ChatCraftModel";
import { countTokens } from "./ai";

export class ChatCraftAiMessageVersion {
  id: string;
  date: Date;
  model: ChatCraftModel;
  text: string;

  constructor({ date, model, text }: { date?: Date; model: ChatCraftModel; text: string }) {
    this.id = nanoid();
    this.date = date ?? new Date();
    this.model = model;
    this.text = text;
  }

  toJSON() {
    return {
      ...this,
      model: this.model.toString(),
    };
  }
}

// When we serialize to JSON, flatten Dates to strings, model etc.
export type SerializedChatCraftMessage = {
  id: string;
  date: string;
  type: MessageType;
  model?: string;
  user?: User;
  text: string;
  versions?: { id: string; date: string; model: string; text: string }[];
};

export class ChatCraftMessage {
  id: string;
  date: Date;
  type: MessageType;
  text: string;
  readonly: boolean;

  constructor({
    id,
    date,
    type,
    text,
    readonly,
  }: {
    id?: string;
    date?: Date;
    type: MessageType;
    text: string;
    readonly?: boolean;
  }) {
    this.id = id ?? nanoid();
    this.date = date ?? new Date();
    this.type = type;
    this.text = text;

    // When we load a message outside the db (e.g., from shared chat via JSON) it is readonly
    this.readonly = readonly === true;
  }

  async tokens() {
    return countTokens(this.text);
  }

  static async delete(id: string) {
    return db.messages.delete(id);
  }

  clone() {
    return new ChatCraftMessage({
      type: this.type,
      text: this.text,
    });
  }

  toJSON(): SerializedChatCraftMessage {
    return {
      id: this.id,
      date: this.date.toISOString(),
      type: this.type,
      text: this.text,
    };
  }

  // Convert to a BaseMessage or derived type
  toLangChainMessage() {
    const text = this.text;

    switch (this.type) {
      case "ai":
        return new AIMessage(text);
      case "human":
        return new HumanMessage(text);
      case "system":
        return new SystemMessage(text);
      case "generic":
      // falls through
      case "function":
      // falls through
      default:
        throw new Error(`${this.type} message conversion to langchain not implemented`);
    }
  }

  toDB(chatId: string): ChatCraftMessageTable {
    return {
      id: this.id,
      date: this.date,
      chatId,
      type: this.type,
      text: this.text,
    };
  }

  async save(chatId: string) {
    if (this.readonly) {
      return;
    }
    return db.messages.put(this.toDB(chatId));
  }

  // Parse from serialized JSON
  static fromJSON(message: SerializedChatCraftMessage): ChatCraftMessage {
    switch (message.type) {
      case "ai":
        return ChatCraftAiMessage.fromJSON(message);
      case "human":
        return ChatCraftHumanMessage.fromJSON(message);
      case "system":
        return ChatCraftSystemMessage.fromJSON(message);
      case "generic":
        return ChatCraftAppMessage.fromJSON(message);
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
      case "generic":
        return ChatCraftAppMessage.fromDB(message);
      default:
        throw new Error(`Error parsing unknown message type: ${message.type}`);
    }
  }
}

export class ChatCraftAiMessage extends ChatCraftMessage {
  model: ChatCraftModel;
  versions: ChatCraftAiMessageVersion[];

  constructor({
    id,
    date,
    model,
    text,
    versions,
    readonly,
  }: {
    id?: string;
    date?: Date;
    model: ChatCraftModel;
    text: string;
    versions?: ChatCraftAiMessageVersion[];
    readonly?: boolean;
  }) {
    super({ id, date, type: "ai", text, readonly });

    this.model = model;
    this.versions = versions ?? [new ChatCraftAiMessageVersion({ date, model, text })];
  }

  addVersion(version: ChatCraftAiMessageVersion) {
    if (this.readonly) {
      return;
    }
    this.versions.push(version);
  }

  switchVersion(id: string) {
    if (this.readonly) {
      return;
    }

    const version = this.versions.find((v) => v.id === id);
    if (!version) {
      throw new Error(`no such version: ${id}`);
    }

    const { date, model, text } = version;
    this.date = date;
    this.model = model;
    this.text = text;
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

  clone() {
    return new ChatCraftAiMessage({
      model: this.model,
      text: this.text,
      versions: this.versions,
    });
  }

  toJSON(): SerializedChatCraftMessage {
    return {
      ...super.toJSON(),
      model: this.model.toString(),
      versions: this.versions.map((version) => ({
        ...version,
        date: version.date.toISOString(),
        model: version.model.toString(),
      })),
    };
  }

  toDB(chatId: string): ChatCraftMessageTable {
    return {
      id: this.id,
      date: this.date,
      chatId,
      type: this.type,
      text: this.text,
      model: this.model.toString(),
      versions: this.versions.map((version) => ({
        id: version.id,
        date: version.date,
        model: version.model.toString(),
        text: version.text,
      })),
    };
  }

  static fromJSON(message: SerializedChatCraftMessage) {
    return new ChatCraftAiMessage({
      id: message.id,
      date: new Date(message.date),
      model: new ChatCraftModel(message.model || "gpt-3.5-turbo"),
      text: message.text,
      versions: message.versions?.map(
        (version) =>
          new ChatCraftAiMessageVersion({
            ...version,
            date: new Date(version.date),
            model: new ChatCraftModel(version.model),
          })
      ),
      readonly: true,
    });
  }

  static fromDB(message: ChatCraftMessageTable) {
    return new ChatCraftAiMessage({
      id: message.id,
      date: message.date,
      model: new ChatCraftModel(message.model || "gpt-3.5-turbo"),
      text: message.text,
      versions: message.versions?.map(
        (version) =>
          new ChatCraftAiMessageVersion({ ...version, model: new ChatCraftModel(version.model) })
      ),
    });
  }
}

export class ChatCraftHumanMessage extends ChatCraftMessage {
  user?: User;

  constructor({
    id,
    date,
    user,
    text,
    readonly,
  }: {
    id?: string;
    date?: Date;
    user?: User;
    text: string;
    readonly?: boolean;
  }) {
    super({ id, date, type: "human", text, readonly });

    this.user = user;
  }

  clone() {
    return new ChatCraftHumanMessage({
      user: this.user,
      text: this.text,
    });
  }

  toJSON(): SerializedChatCraftMessage {
    return {
      ...super.toJSON(),
      user: this.user,
    };
  }

  toDB(chatId: string): ChatCraftMessageTable {
    return {
      id: this.id,
      date: this.date,
      chatId,
      type: this.type,
      text: this.text,
      user: this.user,
    };
  }

  static fromJSON(message: SerializedChatCraftMessage) {
    return new ChatCraftHumanMessage({
      id: message.id,
      date: new Date(message.date),
      user: message.user,
      text: message.text,
      readonly: true,
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
  constructor({
    id,
    date,
    text,
    readonly,
  }: {
    id?: string;
    date?: Date;
    text: string;
    readonly?: boolean;
  }) {
    super({ id, date, type: "system", text, readonly });
  }

  clone() {
    return new ChatCraftSystemMessage({
      text: this.text,
    });
  }

  static fromJSON(message: SerializedChatCraftMessage) {
    return new ChatCraftSystemMessage({
      id: message.id,
      date: new Date(message.date),
      text: message.text,
      readonly: true,
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

// Messages we display to the user in ChatCraft, but don't store in db or send to AI
export class ChatCraftAppMessage extends ChatCraftMessage {
  constructor({
    id,
    date,
    text,
    readonly,
  }: {
    id?: string;
    date?: Date;
    text: string;
    readonly?: boolean;
  }) {
    super({ id, date, type: "generic", text, readonly });
  }

  // These are never used for anything other than info in the UI
  async tokens() {
    return 0;
  }

  clone() {
    return new ChatCraftAppMessage({
      text: this.text,
    });
  }

  static fromJSON(message: SerializedChatCraftMessage) {
    return new ChatCraftAppMessage({
      id: message.id,
      date: new Date(message.date),
      text: message.text,
      readonly: true,
    });
  }

  static fromDB(message: ChatCraftMessageTable) {
    return new ChatCraftAppMessage({
      id: message.id,
      date: message.date,
      text: message.text,
    });
  }

  /**
   * Specialized App Messages that get displayed with their own UI.
   * See src/components/Message/AppMessage/* for UI aspects of this.
   */

  // API Key instructions
  static instructions() {
    return new ChatCraftAppMessage({ text: "app:instructions" });
  }
  static isInstructions(message: ChatCraftMessage) {
    return message instanceof ChatCraftAppMessage && message.text === "app:instructions";
  }

  // General App help
  static help() {
    return new ChatCraftAppMessage({ text: "app:help" });
  }
  static isHelp(message: ChatCraftMessage) {
    return message instanceof ChatCraftAppMessage && message.text === "app:help";
  }
}
