import { useLoaderData } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";

import { ChatCraftChat } from "../lib/ChatCraftChat";
import ChatBase from "./ChatBase";
import { AutoScrollProvider } from "../hooks/use-autoscroll";

// Load a chat from the database locally
export default function LocalChat() {
  const chatId = useLoaderData() as string;
  const chat = useLiveQuery<ChatCraftChat | undefined>(() => {
    if (chatId) {
      return Promise.resolve(ChatCraftChat.find(chatId));
    }
  }, [chatId]);

  return chat ? (
    <AutoScrollProvider>
      <ChatBase chat={chat} />
    </AutoScrollProvider>
  ) : null;
}
