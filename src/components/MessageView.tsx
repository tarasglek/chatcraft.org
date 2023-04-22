import { BaseChatMessage } from "langchain/schema";
import { Box } from "@chakra-ui/react";

import Message from "./Message";

type MessagesViewProps = {
  messages: BaseChatMessage[];
  onRemoveMessage: (index: number) => void;
};

function MessageView({ messages, onRemoveMessage }: MessagesViewProps) {
  return (
    <Box maxW="1024px" mx="auto" scrollBehavior="smooth">
      {messages.map((message: BaseChatMessage, index: number) => {
        return (
          <Message key={index} message={message} onDeleteClick={() => onRemoveMessage(index)} />
        );
      })}
    </Box>
  );
}

export default MessageView;
