import { memo, useCallback, useState } from "react";
import {
  ChatCraftHumanMessage,
  ChatCraftAiMessage,
  ChatCraftAppMessage,
  ChatCraftMessage,
  ChatCraftSystemMessage,
  ChatCraftFunctionMessage,
} from "../../lib/ChatCraftMessage";
import HumanMessage from "./HumanMessage";
import AiMessage from "./AiMessage";
import AppMessage from "./AppMessage";
import SystemMessage from "./SystemMessage";
import FunctionMessage from "./FunctionMessage";

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
  const [editing, setEditing] = useState(false);

  const handleEditingChange = useCallback(
    (newValue: boolean) => {
      setEditing(newValue);
    },
    [setEditing]
  );

  if (message instanceof ChatCraftAiMessage) {
    return (
      <AiMessage
        message={message}
        chatId={chatId}
        editing={editing}
        onEditingChange={handleEditingChange}
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
        editing={editing}
        onEditingChange={handleEditingChange}
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
        editing={editing}
        onEditingChange={handleEditingChange}
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
        editing={editing}
        onEditingChange={handleEditingChange}
        isLoading={isLoading}
        hidePreviews={hidePreviews}
        onPrompt={onPrompt}
        onDeleteClick={onDeleteClick}
      />
    );
  }

  if (message instanceof ChatCraftFunctionMessage) {
    return (
      <FunctionMessage
        message={message}
        chatId={chatId}
        editing={false}
        onEditingChange={() => {}}
        isLoading={isLoading}
        hidePreviews={hidePreviews}
        onPrompt={onPrompt}
        onDeleteClick={onDeleteClick}
      />
    );
  }

  console.warn(`Message type ${message.type} not yet supported`);
  return null;
}

export default memo(Message);
