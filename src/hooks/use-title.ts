import { useEffect, useState } from "react";
import { ChatCraftChat } from "../lib/ChatCraftChat";
import { useSettings } from "./use-settings";

export default function useTitle(chat: ChatCraftChat) {
  const [title, setTitle] = useState("");
  const { settings } = useSettings();

  useEffect(() => {
    if (!settings.apiKey) {
      setTitle("Please Enter API Key");
    } else {
      setTitle(chat.summary || "New Chat");
    }
  }, [chat.summary, settings.apiKey]);

  // Update the window's title as well
  useEffect(() => {
    // Browsers won't show more than ~55 chars, so truncate.
    document.title = `${title} - ChatCraft`;
  }, [title]);

  return title;
}
