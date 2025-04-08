import { Popover, PopoverTrigger, PopoverContent, PopoverBody } from "@chakra-ui/react";
import { Box, Text } from "@chakra-ui/react";
import React, { useEffect } from "react";
import { useRef, useState } from "react";

type AutoCompleteProps = {
  isOpen: boolean;
  onClose: () => void;
  // inputWidth: number;
  // popupPosition: {
  //   left: number;
  // };
  bgColor: string;
  children: React.ReactNode;
  suggestions: {
    command: string;
    helpTitle: string;
    helpDescription: string;
  }[];
  suggestionRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  selectedIndex: number;
  hoverBg: string;
  onSelect: (suggestion: { command: string }) => void;
};

const AutoCompleteInput = ({
  isOpen,
  onClose,
  // inputWidth,
  // popupPosition,
  bgColor,
  children,
  suggestions,
  suggestionRefs,
  selectedIndex,
  hoverBg,
  onSelect,
}: AutoCompleteProps) => {
  const [popupPosition, setPopupPosition] = useState<number>(0);
  const [inputWidth, setInputWidth] = useState<number>(0);

  const triggerRef = useRef<HTMLElement | null>(null);

  // Set possition and width
  useEffect(() => {
    // const triggerRect = triggerRef.current.getBoundingClientRect();
    if (triggerRef.current) {
      const ancestor = triggerRef.current.closest("#parent");

      if (ancestor) {
        const parentRect = ancestor.getBoundingClientRect();
        setInputWidth(parentRect.width);
        setPopupPosition((parentRect.left + window.scrollX) / 10);
      }
    }
  }, [suggestions.length]);

  // Update width on window resize
  useEffect(() => {
    const updateWidth = () => {
      if (triggerRef.current) {
        const ancestor = triggerRef.current.closest("#parent");
        if (ancestor) {
          setInputWidth(ancestor.getBoundingClientRect().width);
        }
      }
    };
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  return (
    <Popover isOpen={isOpen} onClose={onClose} autoFocus={false} placement="top">
      <PopoverTrigger>
        <PopoverTrigger>
          {React.isValidElement(children)
            ? React.cloneElement(children as React.ReactElement, { ref: triggerRef })
            : children}
        </PopoverTrigger>
      </PopoverTrigger>
      <PopoverContent
        width={`${inputWidth}px`}
        borderRadius="sm"
        boxShadow="lg"
        bg={bgColor}
        zIndex="1000"
        left={popupPosition}
      >
        <PopoverBody maxHeight="250px" overflowY="auto" py={1} px={0} width="100%">
          {suggestions.map((suggestion: any, index: number) => (
            <Box
              key={index}
              ref={(el) => (suggestionRefs.current[index] = el)}
              p={2}
              bg={selectedIndex === index ? hoverBg : bgColor}
              _hover={{ bg: hoverBg }}
              cursor="pointer"
              borderRadius="sm"
              transition="background 0.2s ease-in-out"
              onClick={() => onSelect(suggestion)}
            >
              <Text fontWeight={"semibold"}>{suggestion.helpTitle}</Text>
              <Box fontSize="sm" color="gray.400">
                {suggestion.helpDescription.split(".")[0]}.
              </Box>
            </Box>
          ))}
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
};

export default AutoCompleteInput;
