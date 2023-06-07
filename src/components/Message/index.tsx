import { memo } from "react";
import {
  ChatCraftHumanMessage,
  ChatCraftAiMessage,
  ChatCraftMessage,
} from "../../lib/ChatCraftMessage";
import HumanMessage from "./HumanMessage";
import OpenAiMessage from "./OpenAiMessage";

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
        id={message.id}
        chatId={chatId}
        date={message.date}
        text={message.text}
        isLoading={isLoading}
        hidePreviews={hidePreviews}
        model={message.model}
        onPrompt={onPrompt}
        onDeleteClick={onDeleteClick}
        disableFork={disableFork}
        disableEdit={disableEdit}
      />
    );
  }

  if (message instanceof ChatCraftHumanMessage) {
    const { user } = message;
    return (
      <HumanMessage
        id={message.id}
        chatId={chatId}
        date={message.date}
        name={user?.name || "User"}
        avatarUrl={user?.avatarUrl}
        text={message.text}
        isLoading={isLoading}
        hidePreviews={hidePreviews}
        onPrompt={onPrompt}
        onDeleteClick={onDeleteClick}
        disableFork={disableFork}
        disableEdit={disableEdit}
      />
    );
  }

  // TODO: we don't currently show system messages, but could?
  console.warn(`Message type ${message.type} not yet supported`);
  return null;
}

export default memo(Message);
