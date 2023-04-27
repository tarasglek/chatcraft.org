import { useState } from "react";
import { AIChatMessage, BaseChatMessage } from "langchain/schema";
import {
  Avatar,
  Box,
  Card,
  Flex,
  IconButton,
  useColorModeValue,
  useClipboard,
  useToast,
} from "@chakra-ui/react";
import { CgCloseO } from "react-icons/cg";
import { TbCopy } from "react-icons/tb";

import MarkdownWithMermaid from "./MarkdownWithMermaid";
// Styles for the message text are defined in CSS vs. Chakra-UI
import "./Message.css";

type MessagesViewProps = {
  message: BaseChatMessage;
  loading: boolean;
  onDeleteClick: () => void;
};

function MessageView({ message, loading, onDeleteClick }: MessagesViewProps) {
  const [isMouseOver, setIsMouseOver] = useState(false);
  const { onCopy } = useClipboard(message.text);
  const toast = useToast();
  const isAI = message instanceof AIChatMessage;

  const handleCopy = () => {
    onCopy();
    toast({
      title: "Copied to Clipboard",
      description: "Message text was copied to your clipboard.",
      status: "info",
      duration: 3000,
      position: "top",
      isClosable: true,
    });
  };
  return (
    <Card
      p={6}
      my={6}
      onMouseEnter={() => setIsMouseOver(true)}
      onMouseLeave={() => setIsMouseOver(false)}
    >
      <Flex>
        <Box pr={6}>
          {isAI ? (
            <Avatar size="sm" src={`/ai.png`} />
          ) : (
            <Avatar size="sm" bg={useColorModeValue("gray.600", "gray.500")} />
          )}
        </Box>

        <Box flex="1" maxWidth="100%" overflow="hidden">
          {/* Messages are being rendered in Markdown format */}
          <MarkdownWithMermaid previewCode={!loading}>{message.text}</MarkdownWithMermaid>
        </Box>

        <Flex flexDir={{ base: "column-reverse", md: "row" }} justify="start">
          <IconButton
            aria-label="Copy to Clipboard"
            title="Copy to Clipboard"
            icon={<TbCopy />}
            onClick={() => handleCopy()}
            isDisabled={!isMouseOver}
            color={useColorModeValue("gray.600", "gray.300")}
            variant="ghost"
          />
          <IconButton
            aria-label="Delete"
            title="Delete"
            icon={<CgCloseO />}
            variant="ghost"
            isDisabled={!isMouseOver}
            color={useColorModeValue("gray.600", "gray.300")}
            onClick={() => onDeleteClick()}
          />
        </Flex>
      </Flex>
    </Card>
  );
}

export default MessageView;
