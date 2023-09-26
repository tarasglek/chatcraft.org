import { type RefObject } from "react";

import MobilePromptForm from "./MobilePromptForm";
import DesktopPromptForm from "./DesktopPromptForm";
import useMobileBreakpoint from "../../hooks/use-mobile-breakpoint";
import { useSettings } from "../../hooks/use-settings";

export type PromptFormProps = {
  forkUrl: string;
  onSendClick: (prompt: string) => void;
  // Whether or not to automatically manage the height of the prompt.
  // When `isExpanded` is `false`, Shit+Enter adds rows. Otherwise,
  // the height is determined automatically by the parent.
  isExpanded: boolean;
  toggleExpanded: () => void;
  inputPromptRef: RefObject<HTMLTextAreaElement>;
  isLoading: boolean;
  previousMessage?: string;
};

export default function PromptForm(props: PromptFormProps) {
  const { settings } = useSettings();
  const isMobile = useMobileBreakpoint();

  // Skip showing anything if we don't have an API Key to use
  if (!settings.apiKey) {
    return null;
  }

  return isMobile ? <MobilePromptForm {...props} /> : <DesktopPromptForm {...props} />;
}
