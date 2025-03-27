import React, { useState, useRef } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@chakra-ui/react";

interface AutoCompleteInputProps {
  children: React.ReactElement;
  popoverContent: React.ReactNode;
}

const AutoCompleteInput: React.FC<AutoCompleteInputProps> = ({ children, popoverContent }) => {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFocus = () => setOpen(true);
  const handleBlur = () => setTimeout(() => setOpen(false), 200);

  return (
    <Popover isOpen={open} onClose={() => setOpen(false)}>
      <PopoverTrigger>
        {React.cloneElement(children, {
          ref: inputRef,
          onFocus: handleFocus,
          onBlur: handleBlur,
        })}
      </PopoverTrigger>
      <PopoverContent className="w-full p-2 bg-white shadow-md rounded-md">
        {popoverContent}
      </PopoverContent>
    </Popover>
  );
};

export default AutoCompleteInput;
