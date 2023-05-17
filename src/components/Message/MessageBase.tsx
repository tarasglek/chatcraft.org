import { memo, useCallback, type ReactNode } from "react";
import { Box, Card, Flex, IconButton, useClipboard, useToast } from "@chakra-ui/react";
import { CgCloseO } from "react-icons/cg";
import { TbCopy } from "react-icons/tb";

import Markdown from "../Markdown";
// Styles for the message text are defined in CSS vs. Chakra-UI
import "./Message.css";

export interface MessageBaseProps {
  text: string;
  avatar: ReactNode;
  isLoading: boolean;
  hidePreviews?: boolean;
  onPrompt?: (prompt: string) => void;
  onDeleteClick?: () => void;
}

function MessageBase({
  text,
  avatar,
  isLoading,
  hidePreviews,
  onDeleteClick,
  onPrompt,
}: MessageBaseProps) {
  const { onCopy } = useClipboard(text);
  const toast = useToast();

  const handleCopy = useCallback(() => {
    onCopy();
    toast({
      title: "Copied to Clipboard",
      description: "Message text was copied to your clipboard.",
      status: "info",
      duration: 3000,
      position: "top",
      isClosable: true,
    });
  }, [onCopy, toast]);

  return (
    <Card p={6} my={6}>
      <Flex>
        <Box pr={6}>{avatar}</Box>

        <Box flex="1" maxWidth="100%" overflow="hidden" mt={1}>
          {/* Messages are being rendered in Markdown format */}
          <Markdown previewCode={!hidePreviews} isLoading={isLoading} onPrompt={onPrompt}>
            {text}
          </Markdown>
        </Box>

        <Flex
          flexDir={{ base: "column-reverse", md: "row" }}
          minW={{ md: "80px " }}
          justify="start"
        >
          <IconButton
            aria-label="Copy to Clipboard"
            title="Copy to Clipboard"
            icon={<TbCopy />}
            onClick={() => handleCopy()}
            color="gray.600"
            _dark={{ color: "gray.300" }}
            variant="ghost"
          />
          {onDeleteClick && (
            <IconButton
              aria-label="Delete"
              title="Delete"
              icon={<CgCloseO />}
              variant="ghost"
              color="gray.600"
              _dark={{ color: "gray.300" }}
              onClick={onDeleteClick && (() => onDeleteClick())}
            />
          )}
        </Flex>
      </Flex>
    </Card>
  );
}

// Memoize to reduce re-renders/flickering when content hasn't changed
export default memo(MessageBase);
