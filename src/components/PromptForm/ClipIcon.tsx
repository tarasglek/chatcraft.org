import { useState, useRef } from "react";
import { IconButton } from "@chakra-ui/react";
import { BsPaperclip } from "react-icons/bs";

import useMobileBreakpoint from "../../hooks/use-mobile-breakpoint";

type ClipIconProps = {
  isDisabled: boolean;
};

export default function ClipIcon({ isDisabled = false }: ClipIconProps) {
  const isMobile = useMobileBreakpoint();
  const [colorScheme /*, setColorScheme */] = useState<"blue" | "red">("blue");
  const clipIconRef = useRef<HTMLButtonElement | null>(null);

  return (
    <IconButton
      isRound
      isDisabled={isDisabled}
      colorScheme={colorScheme}
      variant={isMobile ? "outline" : "ghost"}
      icon={<BsPaperclip />}
      aria-label="Record speech"
      size={isMobile ? "lg" : "md"}
      fontSize="18px"
      ref={clipIconRef}
    />
  );
}
