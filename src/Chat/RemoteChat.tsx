import { useLoaderData } from "react-router-dom";

import { ChatCraftChat } from "../lib/ChatCraftChat";
import ChatBase from "./ChatBase";

type LocalChatProps = {
  readonly: boolean;
};

// Load a chat from over the network as a JSON blob (already available via loader)
export default function LocalChat({ readonly }: LocalChatProps) {
  const chat = useLoaderData() as ChatCraftChat;

  // TODO: need some kind of error handling here if `chat` doesn't exist
  return chat ? <ChatBase chat={chat} readonly={readonly} canDelete={false} /> : null;
}
