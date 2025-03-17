import { createContext, useContext } from "react";
import { useParams } from "react-router-dom";
import { ChatCraftChat } from "../lib/ChatCraftChat";
import { useLiveQueryTraced } from "../lib/performance";

interface ChatContextType {
  chat: ChatCraftChat | undefined;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { id } = useParams();
  const chat = useLiveQueryTraced("find-chat", () => (id ? ChatCraftChat.find(id) : undefined), [
    id,
  ]);

  return <ChatContext.Provider value={{ chat }}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
