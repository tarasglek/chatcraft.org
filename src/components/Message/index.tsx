import { memo, useCallback, useState } from "react";
import {
  ChatCraftHumanMessage,
  ChatCraftAiMessage,
  ChatCraftAppMessage,
  ChatCraftMessage,
  ChatCraftSystemMessage,
  ChatCraftFunctionCallMessage,
  ChatCraftFunctionResultMessage,
} from "../../lib/ChatCraftMessage";
import HumanMessage from "./HumanMessage";
import AiMessage from "./AiMessage";
import AppMessage from "./AppMessage";
import SystemMessage from "./SystemMessage";
import FunctionCallMessage from "./FunctionCallMessage";
import FunctionResultMessage from "./FunctionResultMessage";

type MessageProps = {
  message: ChatCraftMessage;
  chatId: string;
  isLoading: boolean;
  hidePreviews?: boolean;
  onPrompt?: (prompt?: string) => void;
  onResubmitClick?: () => void;
  onDeleteBeforeClick?: () => void;
  onDeleteClick?: () => void;
  onDeleteAfterClick?: () => void;
  hasMessagesAfter?: boolean;
  disableFork?: boolean;
  disableEdit?: boolean;
};

function Message({
  message,
  chatId,
  isLoading,
  hidePreviews,
  onResubmitClick,
  onDeleteBeforeClick,
  onDeleteClick,
  onDeleteAfterClick,
  onPrompt,
  hasMessagesAfter,
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
        onDeleteBeforeClick={onDeleteBeforeClick}
        onDeleteClick={onDeleteClick}
        onDeleteAfterClick={onDeleteAfterClick}
        hasMessagesAfter={hasMessagesAfter}
        disableFork={disableFork}
        disableEdit={message.readonly ?? disableEdit}
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
        onResubmitClick={onResubmitClick}
        onDeleteBeforeClick={onDeleteBeforeClick}
        onDeleteClick={onDeleteClick}
        onDeleteAfterClick={onDeleteAfterClick}
        hasMessagesAfter={hasMessagesAfter}
        disableFork={disableFork}
        disableEdit={message.readonly ?? disableEdit}
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
        onDeleteBeforeClick={onDeleteBeforeClick}
        onDeleteClick={onDeleteClick}
        onDeleteAfterClick={onDeleteAfterClick}
        hasMessagesAfter={hasMessagesAfter}
        disableFork={true}
        disableEdit={message.readonly ?? disableEdit}
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
        /* We can't delete anything before the system message, since it's first */
        onDeleteClick={onDeleteClick}
        onDeleteAfterClick={onDeleteAfterClick}
        hasMessagesAfter={hasMessagesAfter}
        disableEdit={message.readonly ?? disableEdit}
      />
    );
  }

  if (message instanceof ChatCraftFunctionCallMessage) {
    return (
      <FunctionCallMessage
        message={message}
        chatId={chatId}
        editing={false}
        onEditingChange={() => {}}
        isLoading={isLoading}
        hidePreviews={hidePreviews}
        onPrompt={onPrompt}
        onDeleteBeforeClick={onDeleteBeforeClick}
        onDeleteClick={onDeleteClick}
        onDeleteAfterClick={onDeleteAfterClick}
        hasMessagesAfter={hasMessagesAfter}
      />
    );
  }

  if (message instanceof ChatCraftFunctionResultMessage) {
    return (
      <FunctionResultMessage
        message={message}
        chatId={chatId}
        editing={false}
        onEditingChange={() => {}}
        isLoading={isLoading}
        hidePreviews={hidePreviews}
        onPrompt={onPrompt}
        onDeleteBeforeClick={onDeleteBeforeClick}
        onDeleteClick={onDeleteClick}
        onDeleteAfterClick={onDeleteAfterClick}
        hasMessagesAfter={hasMessagesAfter}
      />
    );
  }

  console.warn(`Message type ${message.type} not yet supported`);
  return null;
}

export default memo(Message);
