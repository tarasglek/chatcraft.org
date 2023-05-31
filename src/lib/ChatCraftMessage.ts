import { nanoid } from "nanoid";
import { BaseChatMessage, type MessageType } from "langchain/schema";

export type SerializedChatCraftMessage = {
  id: string;
  date: Date;
  type: MessageType;
  model?: GptModel;
  user?: User;
  text: string;
};

// A decorated langchain chat message, with extra metadata
export class ChatCraftMessage extends BaseChatMessage {
  id: string;
  date: Date;
  type: MessageType;
  model?: GptModel;
  user?: User;

  constructor({
    id,
    date,
    type,
    model,
    user,
    text,
  }: {
    id?: string;
    date?: Date;
    type: MessageType;
    model?: GptModel;
    user?: User;
    text: string;
  }) {
    super(text);

    this.id = id ?? nanoid();
    this.date = date ?? new Date();
    this.type = type;
    // We may or may not have info about the model (e.g., ai message will)
    if (model) {
      this.model = model;
    }
    // We may or may not have user info (e.g., human message will)
    if (user) {
      this.user = user;
    }
  }

  clone() {
    // Create a new message (don't use current id)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...rest } = this;
    return new ChatCraftMessage(rest);
  }

  // Comply with BaseChatMessage's need for _getType()
  _getType(): MessageType {
    return this.type;
  }

  // XXX: we can't override .toJSON() from BaseChatMessage
  serialize(): SerializedChatCraftMessage {
    return {
      id: this.id,
      date: this.date,
      type: this.type,
      model: this.model,
      user: this.user,
      text: this.text,
    };
  }

  static parse({
    id,
    date,
    type,
    model,
    user,
    text,
  }: SerializedChatCraftMessage): ChatCraftMessage {
    if (type === "ai") {
      return new ChatCraftAiMessage({ id, date, model: model || "gpt-3.5-turbo", text });
    } else if (type === "human") {
      return new ChatCraftHumanMessage({ id, date, user, text });
    } else {
      return new ChatCraftSystemMessage({ id, date, text });
    }
  }
}

export class ChatCraftAiMessage extends ChatCraftMessage {
  constructor({
    id,
    date,
    model,
    text,
  }: {
    id?: string;
    date?: Date;
    model: GptModel;
    text: string;
  }) {
    super({ id, date, type: "ai", model, text });
  }
}

export class ChatCraftHumanMessage extends ChatCraftMessage {
  constructor({ id, date, user, text }: { id?: string; date?: Date; user?: User; text: string }) {
    super({ id, date, type: "human", user, text });
  }
}

export class ChatCraftSystemMessage extends ChatCraftMessage {
  constructor({ id, date, text }: { id?: string; date?: Date; text: string }) {
    super({ id, date, type: "system", text });
  }
}

export const ApiKeyInstructionsText = `I am a helpful assistant, but before I can help, you need to enter an
 [OpenAI API Key](https://platform.openai.com/account/api-keys) below. Here's an example of what
 an API Key looks like:

 \`sk-tVqEo67MxnfAAPQ68iuVT#ClbkFJkUz4oUblcvyUUxrg4T0\`
 
 Please enter your API Key in the form below to begin chatting!
`;

export const AiGreetingText = "I am a helpful assistant! How can I help?";
