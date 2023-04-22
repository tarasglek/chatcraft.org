import { useState } from "react";
import { BaseChatMessage } from "langchain/schema";
import {
  Avatar,
  Box,
  ButtonGroup,
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

type MessagesViewProps = {
  message: BaseChatMessage;
  onDeleteClick: () => void;
};

function MessageView({ message, onDeleteClick }: MessagesViewProps) {
  const [isMouseOver, setIsMouseOver] = useState(false);
  const { onCopy } = useClipboard(message.text);
  const toast = useToast();

  const isAI = message._getType() === "ai";

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
      <Flex gap={2}>
        <Box pr={4}>
          {isAI ? (
            <Avatar size="sm" name="OpenAI" src={`/ai.png`} />
          ) : (
            <Avatar size="sm" bg={useColorModeValue("gray.600", "gray.500")} />
          )}
        </Box>

        <Box flex="1" maxWidth="100%" overflow="hidden">
          {/* Messages are being rendered in Markdown format */}
          <MarkdownWithMermaid>{message.text}</MarkdownWithMermaid>
        </Box>

        <Box>
          <ButtonGroup isAttached visibility={isMouseOver ? "visible" : "hidden"}>
            <IconButton
              aria-label="Copy to Clipboard"
              title="Copy to Clipboard"
              icon={<TbCopy />}
              onClick={() => handleCopy()}
              color={useColorModeValue("gray.500", "gray.300")}
              variant="ghost"
            />
            <IconButton
              aria-label="Delete"
              title="Delete"
              icon={<CgCloseO />}
              variant="ghost"
              color={useColorModeValue("gray.600", "gray.300")}
              onClick={() => onDeleteClick()}
            />
          </ButtonGroup>
        </Box>
      </Flex>
    </Card>
  );
}

export default MessageView;
