import { useLoaderData } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";

import { ChatCraftChat } from "../lib/ChatCraftChat";
import ChatBase from "./ChatBase";

type LocalChatProps = {
  readonly: boolean;
};

// Load a chat from the database locally
export default function LocalChat({ readonly }: LocalChatProps) {
  const chatId = useLoaderData() as string;
  const chat = useLiveQuery<ChatCraftChat | undefined>(() => {
    if (chatId) {
      return Promise.resolve(ChatCraftChat.find(chatId));
    }
  }, [chatId]);

  // TODO: need some kind of error handling here if `chat` doesn't exist
  return chat ? <ChatBase chat={chat} readonly={readonly} canDelete={true} /> : null;
}
