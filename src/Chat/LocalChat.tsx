import { useLoaderData } from "react-router-dom";
import { useLiveQueryTraced } from "../lib/performance";
import { ChatCraftChat } from "../lib/ChatCraftChat";
import ChatBase from "./ChatBase";
import { AutoScrollProvider } from "../hooks/use-autoscroll";

// Load a chat from the database locally
export default function LocalChat() {
  const chatId = useLoaderData() as string;
  const chat = useLiveQueryTraced<ChatCraftChat | undefined>(
    () => chatId ? ChatCraftChat.find(chatId) : undefined,
    [chatId],
    undefined,
    'find-chat'
  );

  return chat ? (
    <AutoScrollProvider>
      <ChatBase chat={chat} />
    </AutoScrollProvider>
  ) : null;
}
