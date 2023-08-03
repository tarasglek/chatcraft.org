import { useLoaderData } from "react-router-dom";

import { ChatCraftChat } from "../lib/ChatCraftChat";
import ChatBase from "./ChatBase";
import { AutoScrollProvider } from "../hooks/use-autoscroll";

// Load a chat from over the network as a JSON blob (already available via loader)
export default function RemoteChat() {
  const chat = useLoaderData() as ChatCraftChat;

  return chat ? (
    <AutoScrollProvider>
      <ChatBase chat={chat} />
    </AutoScrollProvider>
  ) : null;
}
