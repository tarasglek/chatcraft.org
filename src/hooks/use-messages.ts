import {
  AIChatMessage,
  BaseChatMessage,
  HumanChatMessage,
  SystemChatMessage,
} from "langchain/schema";
import { useLocalStorage } from "react-use";
import { useSettings } from "./use-settings";
import { useEffect, useState } from "react";
import useChatOpenAI, { systemMessage } from "./use-chat-openai";

const obj2msg = (obj: { role: string; content: string }): BaseChatMessage =>
  obj.role === "user" ? new HumanChatMessage(obj.content) : new AIChatMessage(obj.content);

const msg2obj = (msg: BaseChatMessage): { role: string; content: string } =>
  msg instanceof HumanChatMessage
    ? { role: "user", content: msg.text }
    : { role: "assistant", content: msg.text };

function useMessages() {
  const { settings } = useSettings();

  const greetingMessage = "I am a helpful assistant! How can I help?";

  const justShowMeTheCodeMessage =
    "I just show the new code, nothing else. I don't explain anything.";
  const instructionMessage = `I am a helpful assistant! Before I can help, you need to enter an
  [OpenAI API Key](https://platform.openai.com/account/api-keys). Here's an example of what
  an API Key looks like:

  \`sk-tVqEo67MxnfAAPQ68iuVT#ClbkFJkUz4oUblcvyUUxrg4T0\` (this is just an example).

  Enter your API Key below to begin chatting!`;

  const initialMessages = (hasApiKey: boolean): BaseChatMessage[] => [
    new AIChatMessage(hasApiKey ? greetingMessage : instructionMessage),
  ];

  const { getTokenInfo } = useChatOpenAI();
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | undefined>();
  const hasApiKey = !!settings.apiKey;
  const [storage, setStorage] = useLocalStorage<BaseChatMessage[]>(
    "messages",
    [new AIChatMessage(greetingMessage)],
    {
      raw: false,
      serializer(value: BaseChatMessage[]) {
        return JSON.stringify(value.map(msg2obj));
      },
      deserializer(value: string) {
        return JSON.parse(value).map(obj2msg);
      },
    }
  );
  const [messages, setMessages] = useState<BaseChatMessage[]>(
    storage || initialMessages(hasApiKey)
  );

  // When the user enters an API Key (or removes it), update first message
  useEffect(() => {
    if (!hasApiKey && messages.length >= 1 && messages[0].text !== instructionMessage) {
      setMessages([new AIChatMessage(instructionMessage)]);
      return;
    }

    // Replace the instructions when an api key is added if necessary
    if (hasApiKey && messages[0].text === instructionMessage) {
      const newMessages = [new AIChatMessage(greetingMessage), ...messages.slice(1)];
      setMessages(newMessages);
    }
  }, [hasApiKey, messages]);

  useEffect(() => {
    if (!hasApiKey || !messages.length) {
      return;
    }

    const fromGreetingToJustCode =
      settings.justShowMeTheCode && messages[0].text === greetingMessage;
    const fromJustCodeToGreeting =
      !settings.justShowMeTheCode && messages[0].text === justShowMeTheCodeMessage;
    if (fromGreetingToJustCode) {
      setMessages([new AIChatMessage(justShowMeTheCodeMessage), ...messages.slice(1)]);
    }
    if (fromJustCodeToGreeting) {
      setMessages([new AIChatMessage(greetingMessage), ...messages.slice(1)]);
    }
  }, [hasApiKey, messages, settings.justShowMeTheCode]);

  // Update localStorage when the messages change
  useEffect(() => {
    setStorage(messages);
  }, [setStorage, messages]);

  // Count the number of tokens in messages, if the user opts in.
  useEffect(() => {
    if (settings.countTokens) {
      // Include the system message too, since we send that as well
      getTokenInfo([new SystemChatMessage(systemMessage), ...messages])
        .then(setTokenInfo)
        .catch((err: any) => console.warn("Unable to count tokens in messages", err.message));
    } else {
      setTokenInfo(undefined);
    }
  }, [messages, settings, getTokenInfo, setTokenInfo]);

  return {
    messages: messages,
    tokenInfo,
    setMessages(messages?: BaseChatMessage[]) {
      // Allow clearing existing messages back to the initial message list
      const newMessages = messages || initialMessages(hasApiKey);
      setMessages(newMessages);
    },
    removeMessage(message: BaseChatMessage) {
      setMessages((messages || initialMessages(hasApiKey)).filter((m) => m !== message));
    },
  };
}

export default useMessages;
