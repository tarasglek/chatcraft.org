import { uuid } from "./utils";

import { BaseChatMessage, type MessageType } from "langchain/schema";

// We store ChatCraft messages as flat JSON
export type SerializedChatCraftMessage = {
  id: string;
  type: MessageType;
  model?: GptModel;
  user?: User;
  text: string;
};

// A decorated langchain chat message, with extra metadata
export class ChatCraftMessage extends BaseChatMessage {
  id: string;
  type: MessageType;
  model?: GptModel;
  user?: User;

  constructor({
    id,
    type,
    model,
    user,
    text,
  }: {
    id?: string;
    type: MessageType;
    model?: GptModel;
    user?: User;
    text: string;
  }) {
    super(text);

    // We didn't used to have an `id`, so generate if missing
    this.id = id ?? uuid();
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

  // Comply with BaseChatMessage's need for _getType()
  _getType(): MessageType {
    return this.type;
  }

  // XXX: we can't override .toJSON() from BaseChatMessage
  serialize(): SerializedChatCraftMessage {
    return {
      id: this.id,
      type: this.type,
      model: this.model,
      user: this.user,
      text: this.text,
    };
  }

  static parse({ id, type, model, user, text }: SerializedChatCraftMessage): ChatCraftMessage {
    if (type === "ai") {
      return new ChatCraftAiMessage({ id, model: model || "gpt-3.5-turbo", text });
    } else if (type === "human") {
      return new ChatCraftHumanMessage({ id, user, text });
    } else {
      return new ChatCraftSystemMessage({ id, text });
    }
  }
}

export class ChatCraftAiMessage extends ChatCraftMessage {
  constructor({ id, model, text }: { id?: string; model: GptModel; text: string }) {
    super({ id, type: "ai", model, text });
  }
}

export class ChatCraftHumanMessage extends ChatCraftMessage {
  constructor({ id, user, text }: { id?: string; user?: User; text: string }) {
    super({ id, type: "human", user, text });
  }
}

export class ChatCraftSystemMessage extends ChatCraftMessage {
  constructor({ id, text }: { id?: string; text: string }) {
    super({ id, type: "system", text });
  }
}

export const ApiKeyInstructionsMessage = new ChatCraftAiMessage({
  text: `I am a helpful assistant, but before I can help, you need to enter an
 [OpenAI API Key](https://platform.openai.com/account/api-keys) below. Here's an example of what
 an API Key looks like:

 \`sk-tVqEo67MxnfAAPQ68iuVT#ClbkFJkUz4oUblcvyUUxrg4T0\`
 
 Please enter your API Key in the form below to begin chatting!
`,
  model: "gpt-3.5-turbo",
});
