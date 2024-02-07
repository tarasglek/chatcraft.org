import { useEffect, useState } from "react";
import { ChatCraftChat } from "../lib/ChatCraftChat";

export default function useTitle(chat: ChatCraftChat) {
  const [title, setTitle] = useState("");

  useEffect(() => {
    setTitle(chat.summary || "New Chat");
  }, [chat.summary]);

  // Update the window's title as well
  useEffect(() => {
    // Browsers won't show more than ~55 chars, so truncate.
    document.title = `${title} - ChatCraft`;
  }, [title]);

  return title;
}
