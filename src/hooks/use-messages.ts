import { useEffect, useState } from "react";
import { BaseChatMessage, HumanChatMessage } from "langchain/schema";
import { useLocalStorage } from "react-use";
import { nanoid } from "nanoid";

import { useSettings } from "./use-settings";
import useChatOpenAI from "./use-chat-openai";
import useSystemMessage from "./use-system-message";
import {
  ChatCraftMessage,
  ChatCraftHumanMessage,
  ChatCraftAiMessage,
  ChatCraftSystemMessage,
  type SerializedChatCraftMessage,
} from "../lib/ChatCraftMessage";

const obj2msg = (
  obj: { role: string; content: string } | SerializedChatCraftMessage
): ChatCraftMessage => {
  // Deal with old serialization format
  if ("role" in obj && "content" in obj) {
    if (obj.role === "user") {
      return new ChatCraftHumanMessage({ text: obj.content });
    } else {
      // This is an AI response, but we don't know which model was used.
      // Assume it was ChatGPT
      return new ChatCraftAiMessage({
        model: "gpt-3.5-turbo",
        text: obj.content,
      });
    }
  }

  // Otherwise, use new serialization format
  return ChatCraftMessage.parse(obj);
};

const msg2obj = (msg: BaseChatMessage | ChatCraftMessage): SerializedChatCraftMessage => {
  // New serialization format
  if (msg instanceof ChatCraftMessage) {
    return msg.serialize();
  }

  // It's one of the older message formats, upgrade them
  if (msg instanceof HumanChatMessage) {
    return { id: nanoid(), type: "human", model: null, text: msg.text };
  }
  return { id: nanoid(), type: "ai", model: "gpt-3.5-turbo", text: msg.text };
};

const greetingMessage = "I am a helpful assistant! How can I help?";

const instructionMessage = `I am a helpful assistant! Before I can help, you need to enter an
 [OpenAI API Key](https://platform.openai.com/account/api-keys) below. Here's an example of what
 an API Key looks like:

 \`sk-tVqEo67MxnfAAPQ68iuVT#ClbkFJkUz4oUblcvyUUxrg4T0\` (this is just an example).

 Please enter your API Key in the form below to begin chatting!`;

const initialMessages = (hasApiKey: boolean, model: GptModel): ChatCraftMessage[] =>
  hasApiKey
    ? [
        new ChatCraftAiMessage({
          model,
          text: greetingMessage,
        }),
      ]
    : [
        new ChatCraftAiMessage({
          model,
          text: instructionMessage,
        }),
      ];

function useMessages() {
  const { settings } = useSettings();
  const systemMessage = useSystemMessage();
  const { getTokenInfo } = useChatOpenAI();
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | undefined>();
  const hasApiKey = !!settings.apiKey;
  const [storage, setStorage] = useLocalStorage<ChatCraftMessage[]>(
    "messages",
    initialMessages(hasApiKey, settings.model),
    {
      raw: false,
      serializer(value: ChatCraftMessage[]) {
        return JSON.stringify(value.map(msg2obj));
      },
      deserializer(value: string) {
        return JSON.parse(value).map(obj2msg);
      },
    }
  );
  const [messages, setMessages] = useState<ChatCraftMessage[]>(
    storage || initialMessages(hasApiKey, settings.model)
  );

  // When the user enters an API Key (or removes it), update first message
  useEffect(() => {
    // When the user removes their API key, show the instructions
    if (!hasApiKey) {
      if (messages[0]?.text !== instructionMessage) {
        setMessages([
          new ChatCraftAiMessage({
            model: settings.model,
            text: instructionMessage,
          }),
        ]);
      }
      return;
    }

    // If there is an API key, update the first message if necessary
    if (messages.length !== 1) {
      return;
    }

    // Replace the instructions when an api key is added, if necessary
    if (messages[0].text === instructionMessage) {
      setMessages([
        new ChatCraftAiMessage({
          model: settings.model,
          text: greetingMessage,
        }),
      ]);
    } else if (messages[0].text === greetingMessage) {
      // Change the model icon when the settings change for an empty chat
      if (messages[0].model !== settings.model) {
        setMessages([
          new ChatCraftAiMessage({
            model: settings.model,
            text: greetingMessage,
          }),
        ]);
      }
    }

    // Update the instruction message model to match the new model
  }, [hasApiKey, messages, settings.model]);

  // Update localStorage when the messages change
  useEffect(() => {
    setStorage(messages);
  }, [setStorage, messages]);

  // Count the number of tokens in messages, if the user opts in.
  useEffect(() => {
    if (settings.countTokens) {
      // Include the system message too, since we send that as well
      getTokenInfo([
        new ChatCraftSystemMessage({
          text: systemMessage,
        }),
        ...messages,
      ])
        .then(setTokenInfo)
        .catch((err: any) => console.warn("Unable to count tokens in messages", err.message));
    } else {
      setTokenInfo(undefined);
    }
  }, [systemMessage, messages, settings.countTokens, getTokenInfo, setTokenInfo]);

  return {
    messages: messages,
    tokenInfo,
    setMessages(messages?: ChatCraftMessage[]) {
      // Allow clearing existing messages back to the initial message list
      const newMessages = messages || initialMessages(hasApiKey, settings.model);
      setMessages(newMessages);
    },
    removeMessage(message: ChatCraftMessage) {
      setMessages(
        (messages || initialMessages(hasApiKey, settings.model)).filter((m) => m.id !== message.id)
      );
    },
  };
}

export default useMessages;
