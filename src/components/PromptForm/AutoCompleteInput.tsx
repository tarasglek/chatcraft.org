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
  // isOpen: boolean;
  // onClose: () => void;
  // inputWidth: number;
  // popupPosition: {
  //   left: number;
  // };
  // bgColor: string;
  children: React.ReactNode;
  // triggerRef: React.RefObject<HTMLInputElement>;
  availablePrompts: {
    command: string;
    helpTitle: string;
    helpDescription: string;
  }[];
  // suggestionRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  // selectedIndex: number;
  // hoverBg: string;
  // onSelect: (suggestion: { command: string }) => void;
};

const AutoCompleteInput = ({
  // isOpen,
  // onClose,
  // inputWidth,
  // popupPosition,
  // bgColor,
  children,
  // triggerRef,
  availablePrompts,
  // suggestionRefs,
  // selectedIndex,
  // hoverBg,
  // onSelect,
}: AutoCompleteProps) => {
  const [popupPosition, setPopupPosition] = useState<number>(0);
  const [inputWidth, setInputWidth] = useState<number>(0);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const triggerRef = useRef<HTMLInputElement>(null); // Create the ref inside the component

  const bgColor = useColorModeValue("white", "gray.700");
  const hoverBg = useColorModeValue("gray.200", "gray.600");

  const [suggestions, setSuggestions] = useState<
    { command: string; helpTitle: string; helpDescription: string }[]
  >([]);

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
  }, [suggestions.length, triggerRef]);

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
  }, [triggerRef]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const filteredSuggestions = val
      ? availablePrompts.filter((p) => p.helpTitle.toLowerCase().startsWith(val.toLowerCase()))
      : [];
    setSuggestions(filteredSuggestions);
    setIsPopoverOpen(filteredSuggestions.length > 0);
    setSelectedIndex(0);
  };

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
            setIsPopoverOpen(false); // Close popover
            //onSendClick(selectedSuggestion.command, []); // Submit selected command
            triggerRef.current?.focus(); // Refocus input box
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
          {React.isValidElement(children) && typeof children.type !== "string"
            ? (() => {
                const child = children as React.ReactElement<any>;

                return React.cloneElement(child, {
                  ref: triggerRef,
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                    child.props.onChange?.(e);
                    handleChange(e);
                  },
                  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (!isPopoverOpen) {
                      child.props.onKeyDown?.(e);
                    }
                    handleKeyDown(e);
                  },
                });
              })()
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
