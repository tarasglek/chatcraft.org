import { type RefObject } from "react";
import { useMediaQuery } from "@chakra-ui/react";

import MobilePromptForm from "./MobilePromptForm";
import DesktopPromptForm from "./DesktopPromptForm";

export type PromptFormProps = {
  forkUrl: string;
  onSendClick: (prompt: string) => void;
  // Whether or not to automatically manage the height of the prompt.
  // When `isExpanded` is `false`, Shit+Enter adds rows. Otherwise,
  // the height is determined automatically by the parent.
  isExpanded: boolean;
  toggleExpanded: () => void;
  singleMessageMode: boolean;
  onSingleMessageModeChange: (value: boolean) => void;
  inputPromptRef: RefObject<HTMLTextAreaElement>;
  isLoading: boolean;
  previousMessage?: string;
};

export default function PromptForm(props: PromptFormProps) {
  const [isMobile] = useMediaQuery("(max-width: 480px)");

  return isMobile ? <MobilePromptForm {...props} /> : <DesktopPromptForm {...props} />;
}
