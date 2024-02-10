import { useState, useRef } from "react";
import { IconButton, Input } from "@chakra-ui/react";
import { BsPaperclip } from "react-icons/bs";

import useMobileBreakpoint from "../../hooks/use-mobile-breakpoint";

type AttachProps = {
  isDisabled: boolean;
  onFileSelected: (base64: string) => void;
};

export default function AttachFileButton({ isDisabled = false, onFileSelected }: AttachProps) {
  const isMobile = useMobileBreakpoint();
  const [colorScheme] = useState<"blue" | "red">("blue");
  const clipIconRef = useRef<HTMLButtonElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        const reader = new FileReader();
        reader.onload = (e) => {
          onFileSelected(e.target?.result as string);
        };
        reader.readAsDataURL(files[i]);
      }
      // Reset the input value after file read
      event.target.value = "";
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <Input
        multiple
        type="file"
        ref={fileInputRef}
        hidden
        onChange={handleFileChange}
        accept="image/*"
      />
      <IconButton
        onClick={handleClick}
        isRound
        isDisabled={isDisabled}
        colorScheme={colorScheme}
        variant={isMobile ? "outline" : "ghost"}
        icon={<BsPaperclip />}
        aria-label="Attach file"
        size={isMobile ? "lg" : "md"}
        fontSize="18px"
        ref={clipIconRef}
      />
    </>
  );
}
