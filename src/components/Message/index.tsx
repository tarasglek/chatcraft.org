import { memo } from "react";
import {
  ChatCraftHumanMessage,
  ChatCraftAiMessage,
  ChatCraftAppMessage,
  ChatCraftMessage,
  ChatCraftSystemMessage,
} from "../../lib/ChatCraftMessage";
import HumanMessage from "./HumanMessage";
import OpenAiMessage from "./OpenAiMessage";
import AppMessage from "./AppMessage";
import SystemMessage from "./SystemMessage";

type MessageProps = {
  message: ChatCraftMessage;
  chatId: string;
  isLoading: boolean;
  hidePreviews?: boolean;
  onPrompt?: (prompt: string) => void;
  onDeleteClick?: () => void;
  disableFork?: boolean;
  disableEdit?: boolean;
};

function Message({
  message,
  chatId,
  isLoading,
  hidePreviews,
  onDeleteClick,
  onPrompt,
  disableFork,
  disableEdit,
}: MessageProps) {
  if (message instanceof ChatCraftAiMessage) {
    return (
      <OpenAiMessage
        message={message}
        chatId={chatId}
        isLoading={isLoading}
        hidePreviews={hidePreviews}
        onPrompt={onPrompt}
        onDeleteClick={onDeleteClick}
        disableFork={disableFork}
        disableEdit={message.readonly && disableEdit}
      />
    );
  }

  if (message instanceof ChatCraftHumanMessage) {
    const { user } = message;
    return (
      <HumanMessage
        message={message}
        chatId={chatId}
        name={user?.name || "User"}
        avatarUrl={user?.avatarUrl}
        isLoading={isLoading}
        hidePreviews={hidePreviews}
        onPrompt={onPrompt}
        onDeleteClick={onDeleteClick}
        disableFork={disableFork}
        disableEdit={message.readonly && disableEdit}
      />
    );
  }

  if (message instanceof ChatCraftAppMessage) {
    return (
      <AppMessage
        message={message as ChatCraftAppMessage}
        chatId={chatId}
        isLoading={isLoading}
        hidePreviews={hidePreviews}
        onPrompt={onPrompt}
        onDeleteClick={onDeleteClick}
        disableFork={true}
        disableEdit={message.readonly && disableEdit}
      />
    );
  }

  if (message instanceof ChatCraftSystemMessage) {
    return (
      <SystemMessage
        message={message}
        chatId={chatId}
        isLoading={isLoading}
        hidePreviews={hidePreviews}
        onPrompt={onPrompt}
        onDeleteClick={onDeleteClick}
      />
    );
  }

  // TODO: we don't currently show system messages, but could?
  console.warn(`Message type ${message.type} not yet supported`);
  return null;
}

export default memo(Message);
