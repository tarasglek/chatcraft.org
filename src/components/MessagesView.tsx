import { useCallback, useLayoutEffect, useMemo } from "react";
import { AIChatMessage, BaseChatMessage } from "langchain/schema";
import { Box, Collapse, useColorMode } from "@chakra-ui/react";
import mermaid from "mermaid";

import Message from "./Message";
import NewMessage from "./NewMessage";

type MessagesViewProps = {
  messages: BaseChatMessage[];
  newMessage?: AIChatMessage;
  onRemoveMessage: (message: BaseChatMessage) => void;
  singleMessageMode: boolean;
  loading: boolean;
  isPaused: boolean;
  onTogglePause: () => void;
  onCancel: () => void;
};

function MessagesView({
  messages,
  newMessage,
  onRemoveMessage,
  singleMessageMode,
  loading,
  isPaused,
  onTogglePause,
  onCancel,
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

  // Memoize the onRemoveMessage callback to reduce re-renders
  const memoizedOnRemoveMessage = useCallback(onRemoveMessage, [onRemoveMessage]);

  // Memoize the previous messages so we don't have to update when newMessage changes
  const prevMessages = useMemo(
    () =>
      messages.map((message: BaseChatMessage, index: number) => {
        return (
          <Message
            key={index}
            message={message}
            onDeleteClick={() => memoizedOnRemoveMessage(message)}
          />
        );
      }),
    [messages, memoizedOnRemoveMessage]
  );

  return (
    <Box maxW="900px" mx="auto" minHeight="100%" scrollBehavior="smooth">
      {/* Show entire message history + current streaming response if available */}
      <Collapse in={!singleMessageMode} animateOpacity>
        {prevMessages}

        {newMessage && (
          <NewMessage
            message={newMessage}
            isPaused={isPaused}
            onTogglePause={onTogglePause}
            onCancel={onCancel}
          />
        )}
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
            <NewMessage
              message={newMessage}
              isPaused={isPaused}
              onTogglePause={onTogglePause}
              onCancel={onCancel}
            />
          )}
        </>
      )}
    </Box>
  );
}

export default MessagesView;
