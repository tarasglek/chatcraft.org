import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  useColorModeValue,
} from "@chakra-ui/react";
import { Box, Text } from "@chakra-ui/react";
import React, { useCallback, useEffect } from "react";
import { useRef, useState } from "react";

type AutoCompleteProps = {
  children: React.ReactNode;
  triggerRef: React.RefObject<HTMLTextAreaElement>;
  parentRef: React.RefObject<HTMLDivElement>;
  availablePrompts: {
    command: string;
    helpTitle: string;
    helpDescription: string;
  }[];
};

const AutoCompleteInput = ({
  children,
  triggerRef,
  parentRef,
  availablePrompts,
}: AutoCompleteProps) => {
  const [popupPosition, setPopupPosition] = useState<number>(0);
  const [inputWidth, setInputWidth] = useState<number>(0);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([]);
  // const triggerRef = useRef<HTMLInputElement>(null);

  const bgColor = useColorModeValue("white", "gray.700");
  const hoverBg = useColorModeValue("gray.200", "gray.600");

  const [suggestions, setSuggestions] = useState<
    { command: string; helpTitle: string; helpDescription: string }[]
  >([]);

  // Set possition and width
  useEffect(() => {
    if (triggerRef.current && parentRef.current) {
      const parentRect = parentRef.current.getBoundingClientRect();
      setInputWidth(parentRect.width);
      setPopupPosition((parentRect.left + window.scrollX) / 10);
    }
  }, [parentRef, suggestions.length, triggerRef]);

  // Update width on window resize
  useEffect(() => {
    const updateWidth = () => {
      if (triggerRef.current && parentRef.current) {
        setInputWidth(parentRef.current.getBoundingClientRect().width);
      }
    };
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [parentRef, triggerRef]);
  // Onchange event for popup content
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const filteredSuggestions = val
      ? availablePrompts.filter((p) => p.helpTitle.toLowerCase().startsWith(val.toLowerCase()))
      : [];
    setSuggestions(filteredSuggestions);
    setIsPopoverOpen(filteredSuggestions.length > 0);
    setSelectedIndex(0);
  };
  // Key down events
  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case "ArrowUp":
          if (isPopoverOpen) {
            e.preventDefault();
            if (selectedIndex == -1) {
              setSelectedIndex(0);
            } else {
              setSelectedIndex((prev) => {
                const nextIndex = prev > 0 ? prev - 1 : 0;
                suggestionRefs.current[nextIndex]?.scrollIntoView({
                  behavior: "smooth",
                  block: "nearest",
                });
                return nextIndex;
              });
            }
          }
          break;
        case "ArrowDown":
          if (isPopoverOpen) {
            e.preventDefault();
            if (selectedIndex == -1) {
              setSelectedIndex(0);
            } else {
              setSelectedIndex((prev) => {
                if (prev >= suggestions.length - 1) {
                  setIsPopoverOpen(false);
                  return prev;
                }
                const nextIndex = prev < suggestions.length - 1 ? prev + 1 : prev;
                suggestionRefs.current[nextIndex]?.scrollIntoView({
                  behavior: "smooth",
                  block: "nearest",
                });
                return nextIndex;
              });
            }
          }
          break;

        case "Enter":
          if (
            selectedIndex >= 0 &&
            selectedIndex < suggestions.length &&
            triggerRef.current &&
            isPopoverOpen
          ) {
            e.preventDefault();
            const selectedSuggestion = suggestions[selectedIndex];
            triggerRef.current.value = "/" + selectedSuggestion.command;
            setIsPopoverOpen(false);
            triggerRef.current?.focus();
          }

          break;
        case "Escape":
          if (isPopoverOpen) {
            setIsPopoverOpen(false);
          }
          break;

        default:
          return;
      }
    },
    [isPopoverOpen, selectedIndex, suggestionRefs, suggestions, triggerRef]
  );

  return (
    <Popover
      isOpen={isPopoverOpen}
      onClose={() => setIsPopoverOpen(false)}
      autoFocus={false}
      placement="top"
    >
      <PopoverTrigger>
        <PopoverTrigger>
          {React.isValidElement(children)
            ? React.cloneElement(children as React.ReactElement, {
                ref: triggerRef,
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                  children.props.onChange?.(e);
                  handleChange(e);
                },
                onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (!isPopoverOpen) {
                    children.props.onKeyDown?.(e);
                  }
                  handleKeyDown(e);
                },
              })
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
              onClick={() => {
                if (triggerRef.current) {
                  triggerRef.current.value = "/" + suggestion.command;
                }
                setIsPopoverOpen(false);
                triggerRef.current?.focus();
              }}
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
