import { useCallback, useLayoutEffect, useMemo } from "react";
import { Box, useColorMode } from "@chakra-ui/react";
import mermaid from "mermaid";

import Message from "./Message";
import NewMessage from "./Message/NewMessage";
import {
  ChatCraftMessage,
  ChatCraftAiMessage,
  ChatCraftAppMessage,
  ChatCraftSystemMessage,
} from "../lib/ChatCraftMessage";
import { useSettings } from "../hooks/use-settings";
import { ChatCraftChat } from "../lib/ChatCraftChat";
import { useAlert } from "../hooks/use-alert";

type MessagesViewProps = {
  chat: ChatCraftChat;
  newMessage?: ChatCraftAiMessage;
  isLoading: boolean;
  onRemoveMessage: (message: ChatCraftMessage) => void;
  isPaused: boolean;
  onTogglePause: () => void;
  onCancel: () => void;
  onPrompt: ({
    prompt,
    imageUrls,
    retry,
  }: {
    prompt?: string;
    imageUrls?: string[];
    retry?: boolean;
  }) => void;
};

function MessagesView({
  chat,
  newMessage,
  isLoading,
  onRemoveMessage,
  isPaused,
  onTogglePause,
  onCancel,
  onPrompt,
}: MessagesViewProps) {
  const { colorMode } = useColorMode();
  const { settings } = useSettings();
  const { error } = useAlert();
  const messages = chat.messages();
  const chatId = chat.id;

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

  const deleteMessages = useCallback(
    async (messageId: string, direction: "after" | "before") => {
      try {
        if (direction === "before") {
          await chat.removeMessagesBefore(messageId);
        } else {
          await chat.removeMessagesAfter(messageId);
        }
      } catch (err: any) {
        error({
          title: `Error Deleting Messages`,
          message: err.message,
        });
      }
    },
    [chat, error]
  );

  // Memoize the previous messages so we don't have to update when newMessage changes
  const prevMessages = useMemo(() => {
    // Show all messages in order, unless the only message in the chat
    // is the system prompt AND the user has not entered an API Key. In this case
    // we'll show an instruction message instead (see below).
    if (
      messages.length === 1 &&
      messages[0] instanceof ChatCraftSystemMessage &&
      !settings.currentProvider.apiKey
    ) {
      return;
    }

    // OK to show them all
    return messages.map((message, idx, arr) => {
      // Figure out if we can remove messages before/after this
      const hasMessagesBefore = idx >= 2;
      const hasMessagesAfter = idx < arr.length - 1;

      return (
        <Message
          key={message.id}
          message={message}
          chatId={chatId}
          isLoading={isLoading}
          onResubmitClick={async (promptText?: string) => {
            await deleteMessages(message.id, "after");
            onPrompt({ prompt: promptText, retry: true }); // pass prompt text and true for retry, don't include any imageURLs
          }}
          onDeleteBeforeClick={
            hasMessagesBefore ? () => deleteMessages(message.id, "before") : undefined
          }
          onDeleteClick={() => memoizedOnRemoveMessage(message)}
          onDeleteAfterClick={
            hasMessagesAfter ? () => deleteMessages(message.id, "after") : undefined
          }
          onPrompt={onPrompt}
          hasMessagesAfter={hasMessagesAfter}
        />
      );
    });
  }, [
    messages,
    settings.currentProvider.apiKey,
    chatId,
    onPrompt,
    isLoading,
    memoizedOnRemoveMessage,
    deleteMessages,
  ]);

  const instructions = useMemo(() => {
    // If there's no API key in storage, show instructions so we get one
    if (!settings.currentProvider.apiKey) {
      const message = ChatCraftAppMessage.instructions();
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
  }, [settings.currentProvider.apiKey, chatId, onPrompt, isLoading]);

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
