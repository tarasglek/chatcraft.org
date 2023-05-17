import { BaseChatMessage, type MessageType } from "langchain/schema";
import { nanoid } from "nanoid";

// We store ChatCraft messages as flat JSON
export type SerializedChatCraftMessage = {
  id: string;
  type: MessageType;
  model: GptModel | null;
  text: string;
};

// A decorated langchain chat message, with extra metadata
export class ChatCraftMessage extends BaseChatMessage {
  id: string;
  type: MessageType;
  model?: GptModel;

  constructor({
    id,
    type,
    model,
    text,
  }: {
    id?: string;
    type: MessageType;
    model?: GptModel;
    text: string;
  }) {
    super(text);

    // We didn't used to have an `id`, so generate if missing
    this.id = id ?? nanoid();
    this.type = type;
    // We may or may not have info about the model (e.g., human message)
    if (model) {
      this.model = model;
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
      model: this.model ?? null,
      text: this.text,
    };
  }

  static parse({ id, type, model, text }: SerializedChatCraftMessage): ChatCraftMessage {
    if (type === "ai") {
      return new ChatCraftAiMessage({ id, model: model || "gpt-3.5-turbo", text });
    } else if (type === "human") {
      return new ChatCraftHumanMessage({ id, text });
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
  constructor({ id, text }: { id?: string; text: string }) {
    super({ id, type: "human", text });
  }
}

export class ChatCraftSystemMessage extends ChatCraftMessage {
  constructor({ id, text }: { id?: string; text: string }) {
    super({ id, type: "system", text });
  }
}
