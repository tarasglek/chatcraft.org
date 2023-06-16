import { useCallback, useLayoutEffect, useMemo } from "react";
import { Box, useColorMode } from "@chakra-ui/react";
import mermaid from "mermaid";

import Message from "./Message";
import NewMessage from "./NewMessage";
import {
  ChatCraftMessage,
  ChatCraftAiMessage,
  ChatCraftAppMessage,
  ApiKeyInstructionsText,
  AiGreetingText,
} from "../lib/ChatCraftMessage";
import { useSettings } from "../hooks/use-settings";

type MessagesViewProps = {
  messages: ChatCraftMessage[];
  chatId: string;
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
  chatId,
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
  const { settings } = useSettings();

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
  const prevMessages = useMemo(() => {
    // When we're in singleMessageMode, we collapse all but the final message
    if (singleMessageMode) {
      const lastMessage = messages.at(-1);
      if (lastMessage) {
        return (
          <Message
            message={lastMessage}
            chatId={chatId}
            isLoading={isLoading}
            onDeleteClick={() => memoizedOnRemoveMessage(lastMessage)}
            onPrompt={onPrompt}
          />
        );
      }
    }

    // Otherwise, show all messages in order, unless the only message in the chat
    // is the AI Greeting AND the user has not entered an API Key.  In this case
    // we'll show an instruction message instead (see below).
    if (messages.length === 1 && messages[0].text === AiGreetingText && !settings.apiKey) {
      return;
    }

    // OK to show them all
    return messages.map((message) => (
      <Message
        key={message.id}
        message={message}
        chatId={chatId}
        isLoading={isLoading}
        onDeleteClick={() => memoizedOnRemoveMessage(message)}
        onPrompt={onPrompt}
      />
    ));
  }, [
    messages,
    settings.apiKey,
    chatId,
    singleMessageMode,
    onPrompt,
    isLoading,
    memoizedOnRemoveMessage,
  ]);

  const instructions = useMemo(() => {
    // If there's no API key in storage, show instructions so we get one
    if (!settings.apiKey) {
      const message = new ChatCraftAppMessage({ text: ApiKeyInstructionsText });
      return (
        <Message
          message={message}
          chatId={chatId}
          isLoading={isLoading}
          onPrompt={onPrompt}
          disableFork={true}
          disableEdit={true}
        />
      );
    }
  }, [settings.apiKey, chatId, onPrompt, isLoading]);

  return (
    <Box minHeight="100%" scrollBehavior="smooth">
      <>
        {prevMessages}

        {instructions}

        {newMessage && (
          <NewMessage
            message={newMessage}
            chatId={chatId}
            isPaused={isPaused}
            onTogglePause={onTogglePause}
            onCancel={onCancel}
          />
        )}
      </>
    </Box>
  );
}

export default MessagesView;
