import { memo, useCallback } from "react";
import { AIChatMessage, BaseChatMessage } from "langchain/schema";
import { Avatar, Box, Card, Flex, IconButton, useClipboard, useToast } from "@chakra-ui/react";
import { CgCloseO } from "react-icons/cg";
import { TbCopy } from "react-icons/tb";

import Markdown from "./Markdown";
// Styles for the message text are defined in CSS vs. Chakra-UI
import "./Message.css";

type MessageProps = {
  message: BaseChatMessage;
  loading?: boolean;
  onPrompt?: (prompt: string) => void;
  onDeleteClick?: () => void;
};

function Message({ message, loading, onDeleteClick, onPrompt }: MessageProps) {
  const { onCopy } = useClipboard(message.text);
  const toast = useToast();
  const isAI = message instanceof AIChatMessage;

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
        <Box pr={6}>
          {isAI ? (
            <Avatar size="sm" src={`/ai.png`} />
          ) : (
            <Avatar size="sm" bg="gray.600" _dark={{ bg: "gray.500" }} />
          )}
        </Box>

        <Box flex="1" maxWidth="100%" overflow="hidden" mt={1}>
          {/* Messages are being rendered in Markdown format */}
          <Markdown previewCode={!loading} onPrompt={onPrompt}>
            {message.text}
          </Markdown>
        </Box>

        <Flex flexDir={{ base: "column-reverse", md: "row" }} justify="start">
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
export default memo(Message);
