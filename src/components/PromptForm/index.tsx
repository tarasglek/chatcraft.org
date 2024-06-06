import { type RefObject, Dispatch, SetStateAction } from "react";

import MobilePromptForm from "./MobilePromptForm";
import DesktopPromptForm from "./DesktopPromptForm";
import useMobileBreakpoint from "../../hooks/use-mobile-breakpoint";
import { useSettings } from "../../hooks/use-settings";
import { ChatCraftChat } from "../../lib/ChatCraftChat";

export type PromptFormProps = {
  chat: ChatCraftChat;
  forkUrl: string;
  useRag: boolean;
  setUseRag: Dispatch<SetStateAction<boolean>>;
  onSendClick: (prompt: string) => void;
  inputPromptRef: RefObject<HTMLTextAreaElement>;
  isLoading: boolean;
  previousMessage?: string;
};

export default function PromptForm(props: PromptFormProps) {
  const { settings } = useSettings();
  const isMobile = useMobileBreakpoint();

  // Skip showing anything if we don't have an API Key to use
  if (!settings.currentProvider.apiKey) {
    return null;
  }

  return isMobile ? <MobilePromptForm {...props} /> : <DesktopPromptForm {...props} />;
}
