import { createContext, useContext, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { ChatCraftChat } from "../lib/ChatCraftChat";

interface ChatContextType {
  chat: ChatCraftChat | undefined;
  setChat: (chat: ChatCraftChat | undefined) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [chat, setChat] = useState<ChatCraftChat | undefined>(undefined);
  const { id } = useParams();

  useEffect(() => {
    async function loadChat() {
      if (!id) {
        setChat(undefined);
        return;
      }

      try {
        const loadedChat = await ChatCraftChat.find(id);
        setChat(loadedChat);
      } catch (err) {
        console.error("Error loading chat:", err);
        setChat(undefined);
      }
    }

    loadChat();
  }, [id]);

  return <ChatContext.Provider value={{ chat, setChat }}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
