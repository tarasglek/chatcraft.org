import { AIChatMessage, BaseChatMessage, HumanChatMessage } from "langchain/schema";
import { useLocalStorage } from "react-use";

const obj2msg = (obj: { role: string; content: string }): BaseChatMessage =>
  obj.role === "user" ? new HumanChatMessage(obj.content) : new AIChatMessage(obj.content);

const msg2obj = (msg: BaseChatMessage): { role: string; content: string } =>
  msg instanceof HumanChatMessage
    ? { role: "user", content: msg.text }
    : { role: "assistant", content: msg.text };

const initialMessages: BaseChatMessage[] = [
  new AIChatMessage("I am a helpful assistant! How can I help?"),
];

function useMessages() {
  const [messages, setMessages] = useLocalStorage<BaseChatMessage[]>("messages", initialMessages, {
    raw: false,
    serializer(value: BaseChatMessage[]) {
      return JSON.stringify(value.map(msg2obj));
    },
    deserializer(value: string) {
      return JSON.parse(value).map(obj2msg);
    },
  });

  return {
    messages: messages || initialMessages,
    setMessages(messages?: BaseChatMessage[]) {
      // Allow clearing existing messages back to the initial message list
      setMessages(messages || initialMessages);
    },
    removeMessage(message: BaseChatMessage) {
      setMessages((messages || initialMessages).filter((m) => m !== message));
    },
  };
}

export default useMessages;
