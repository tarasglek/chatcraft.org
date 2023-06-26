import { useEffect } from "react";
import { ChatCraftChat } from "../lib/ChatCraftChat";

export default function useTitle(chat: ChatCraftChat) {
  useEffect(() => {
    // Browsers won't show more than 55 chars, so truncate
    const title = chat.summary?.slice(0, 40) || "New Chat";
    document.title = `${title} - ChatCraft`;
  }, [chat.summary]);
}
