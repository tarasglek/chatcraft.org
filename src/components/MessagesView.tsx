import { AIChatMessage, BaseChatMessage } from "langchain/schema";
import { Box, Collapse } from "@chakra-ui/react";

import Message from "./Message";

type MessagesViewProps = {
  messages: BaseChatMessage[];
  newMessage?: AIChatMessage;
  onRemoveMessage: (message: BaseChatMessage) => void;
  singleMessageMode: boolean;
  loading: boolean;
};

function MessagesView({
  messages,
  newMessage,
  onRemoveMessage,
  singleMessageMode,
  loading,
}: MessagesViewProps) {
  // When we're in singleMessageMode, we collapse all but the final message
  const lastMessage = messages.at(-1);

  return (
    <Box maxW="900px" mx="auto" scrollBehavior="smooth">
      {/* Show entire message history + current streaming response if available */}
      <Collapse in={!singleMessageMode} animateOpacity>
        <>
          {messages.map((message: BaseChatMessage, index: number) => {
            return (
              <Message
                key={index}
                message={message}
                loading={loading && message === lastMessage}
                onDeleteClick={() => onRemoveMessage(message)}
              />
            );
          })}
          {newMessage && (
            <Message message={newMessage} loading={loading && newMessage === lastMessage} />
          )}
        </>
      </Collapse>

      {/* Show only previous response + current streaming response if available */}
      {singleMessageMode && lastMessage && (
        <>
          <Message
            message={lastMessage}
            loading={loading}
            onDeleteClick={() => onRemoveMessage(lastMessage)}
          />

          {newMessage && (
            <Message message={newMessage} loading={loading && newMessage === lastMessage} />
          )}
        </>
      )}
    </Box>
  );
}

export default MessagesView;
