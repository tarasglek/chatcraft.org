import { memo } from "react";
import { ChatCraftMessage } from "../../lib/ChatCraftMessage";
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
  // AI Message
  if (message.type === "ai" && message.model) {
    return (
      <OpenAiMessage
        message={message}
        chatId={chatId}
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

  // Human Message
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
      disableEdit={disableEdit}
    />
  );

  // TODO: we don't currently show system messages, but could?
}

export default memo(Message);
