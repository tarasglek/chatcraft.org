import { memo } from "react";
import { ChatCraftMessage } from "../../lib/ChatCraftMessage";
import HumanMessage from "./HumanMessage";
import OpenAiMessage from "./OpenAiMessage";

type MessageProps = {
  message: ChatCraftMessage;
  isLoading: boolean;
  hidePreviews?: boolean;
  onPrompt?: (prompt: string) => void;
  onDeleteClick?: () => void;
};

function Message({ message, isLoading, hidePreviews, onDeleteClick, onPrompt }: MessageProps) {
  // AI Message
  if (message.type === "ai" && message.model) {
    return (
      <OpenAiMessage
        text={message.text}
        isLoading={isLoading}
        hidePreviews={hidePreviews}
        model={message.model}
        onPrompt={onPrompt}
        onDeleteClick={onDeleteClick}
      />
    );
  }

  // Human Message
  const { user } = message;
  return (
    <HumanMessage
      name={user?.name}
      avatarUrl={user?.avatarUrl}
      text={message.text}
      isLoading={isLoading}
      hidePreviews={hidePreviews}
      onPrompt={onPrompt}
      onDeleteClick={onDeleteClick}
    />
  );

  // TODO: we don't currently show system messages, but could?
}

export default memo(Message);
