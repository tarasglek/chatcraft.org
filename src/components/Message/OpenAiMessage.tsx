import { memo } from "react";
import { Avatar } from "@chakra-ui/react";

import MessageBase, { type MessageBaseProps } from "./MessageBase";

interface OpenAiMessageProps extends Omit<MessageBaseProps, "avatar"> {
  model: GptModel;
}

const getAvatar = (model: GptModel) => {
  switch (model) {
    case "gpt-4":
      return {
        avatar: <Avatar size="sm" bg="#A96CF9" src={`/openai-logo.png`} title="GPT-4" />,
        heading: "GPT-4",
      };
    case "gpt-3.5-turbo":
    // falls through
    default:
      return {
        avatar: <Avatar size="sm" bg="#75AB9C" src={`/openai-logo.png`} title="ChatGPT" />,
        heading: "ChatGPT",
      };
  }
};

function OpenAiMessage(props: OpenAiMessageProps) {
  const { heading, avatar } = getAvatar(props.model);

  return <MessageBase {...props} avatar={avatar} heading={heading} />;
}

export default memo(OpenAiMessage);
