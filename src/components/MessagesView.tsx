import { useCallback, useLayoutEffect, useMemo } from "react";
import { Box, Collapse, useColorMode } from "@chakra-ui/react";
import mermaid from "mermaid";

import Message from "./Message";
import NewMessage from "./NewMessage";
import { ChatCraftMessage, ChatCraftAiMessage } from "../lib/ChatCraftMessage";

type MessagesViewProps = {
  messages: ChatCraftMessage[];
  newMessage?: ChatCraftAiMessage;
  isLoading: boolean;
  onRemoveMessage: (message: ChatCraftMessage) => void;
  singleMessageMode: boolean;
  isPaused: boolean;
  onTogglePause: () => void;
  onCancel: () => void;
  onPrompt: (prompt: string) => void;
};

function MessagesView({
  messages,
  newMessage,
  isLoading,
  onRemoveMessage,
  singleMessageMode,
  isPaused,
  onTogglePause,
  onCancel,
  onPrompt,
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
      messages.map((message) => {
        return (
          <Message
            key={message.id}
            message={message}
            isLoading={isLoading}
            onDeleteClick={() => memoizedOnRemoveMessage(message)}
            onPrompt={onPrompt}
          />
        );
      }),
    [messages, onPrompt, isLoading, memoizedOnRemoveMessage]
  );

  return (
    <Box minHeight="100%" scrollBehavior="smooth">
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
            isLoading={isLoading}
            onDeleteClick={() => onRemoveMessage(lastMessage)}
            onPrompt={onPrompt}
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
