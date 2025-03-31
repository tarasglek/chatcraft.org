import { Popover, PopoverTrigger, PopoverContent, PopoverBody } from "@chakra-ui/react";
import { Box, Text } from "@chakra-ui/react";

const AutoCompleteProps = ({
  isOpen,
  onClose,
  inputWidth,
  popupPosition,
  bgColor,
  children,
  suggestions,
  suggestionRefs,
  selectedIndex,
  hoverBg,
  onSelect,
}: any) => {
  return (
    <Popover isOpen={isOpen} onClose={onClose} autoFocus={false} placement="top">
      <PopoverTrigger>{children}</PopoverTrigger>
      <PopoverContent
        width={`${inputWidth}px`}
        borderRadius="sm"
        boxShadow="lg"
        bg={bgColor}
        zIndex="1000"
        left={popupPosition.left}
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

export default AutoCompleteProps;
