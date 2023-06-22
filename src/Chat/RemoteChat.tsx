import { useLoaderData } from "react-router-dom";

import { ChatCraftChat } from "../lib/ChatCraftChat";
import ChatBase from "./ChatBase";

// Load a chat from over the network as a JSON blob (already available via loader)
export default function RemoteChat() {
  const chat = useLoaderData() as ChatCraftChat;

  // TODO: need some kind of error handling here if `chat` doesn't exist
  return chat ? <ChatBase chat={chat} /> : null;
}
