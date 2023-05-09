import { useLayoutEffect } from "react";
import { AIChatMessage, BaseChatMessage } from "langchain/schema";
import { Box, Collapse, useColorMode } from "@chakra-ui/react";
import mermaid from "mermaid";

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
  const { colorMode } = useColorMode();
  // When we're in singleMessageMode, we collapse all but the final message
  const lastMessage = messages.at(-1);

  // Make sure that any Mermaid diagrams use the same light/dark theme as rest of app.
  // Use a layout effect vs. regular effect so it happens after DOM is ready.
  useLayoutEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: colorMode === "dark" ? "dark" : "default",
      securityLevel: "loose",
    });
  }, [colorMode]);

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
                loading={loading}
                onDeleteClick={() => onRemoveMessage(message)}
              />
            );
          })}
          {newMessage && <Message message={newMessage} loading={loading} />}
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

          {newMessage && <Message message={newMessage} loading={loading} />}
        </>
      )}
    </Box>
  );
}

export default MessagesView;
