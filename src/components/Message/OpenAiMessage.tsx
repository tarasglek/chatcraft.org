import { memo, useCallback, useEffect, useState } from "react";
import { Avatar } from "@chakra-ui/react";

import MessageBase, { type MessageBaseProps } from "./MessageBase";
import { ChatCraftChat } from "../../lib/ChatCraftChat";
import * as ai from "../../lib/ai";
import { useSettings } from "../../hooks/use-settings";

interface OpenAiMessageProps extends Omit<MessageBaseProps, "avatar"> {
  model: GptModel;
}

const getHeading = (model: GptModel) => {
  switch (model) {
    case "gpt-4":
      return "GPT-4";
    case "gpt-3.5-turbo":
    // falls through
    default:
      return "ChatGPT";
  }
};

const getAvatar = (model: GptModel) => {
  switch (model) {
    case "gpt-4":
      return <Avatar size="sm" bg="#A96CF9" src={`/openai-logo.png`} title="GPT-4" />;
    case "gpt-3.5-turbo":
    // falls through
    default:
      return <Avatar size="sm" bg="#75AB9C" src={`/openai-logo.png`} title="ChatGPT" />;
  }
};

function OpenAiMessage(props: OpenAiMessageProps) {
  // We may or many not need to adjust the displayed text (e.g., if retrying)
  const [text, setText] = useState(props.text);
  const [heading, setHeading] = useState(getHeading(props.model));
  const [avatar, setAvatar] = useState(getAvatar(props.model));
  const { settings } = useSettings();

  useEffect(() => {
    setText(props.text);
    setHeading(getHeading(props.model));
    setAvatar(getAvatar(props.model));
  }, [props.text, props.model]);

  // TODO: convert this to use message.* props once other PRs land
  const handleRetryClick = useCallback(
    async (model: GptModel) => {
      if (!settings.apiKey) {
        return;
      }

      try {
        const chat = await ChatCraftChat.find(props.chatId);
        if (!chat) {
          throw new Error(`Unable to find chat with chatId=${props.chatId}`);
        }

        const idx = chat.messages.findIndex((message) => message.id === props.id);
        if (!idx) {
          throw new Error(`Unable to find message within chat with id=${props.id}`);
        }

        setHeading(getHeading(model));
        setAvatar(getAvatar(model));
        setText("");

        const context = chat.messages.slice(0, idx);

        const newText = await ai.chat(context, {
          apiKey: settings.apiKey,
          model: settings.model,
          onToken(_token: string, currentText: string) {
            setText(currentText);
            console.log(currentText);
          },
        });

        setText(newText);
      } catch (err) {
        // TODO: UI error handling
        console.warn("Unable to retry message", { model, err });
      }
    },
    [props.chatId, props.id, settings.apiKey, settings.model]
  );

  return (
    <MessageBase
      {...props}
      text={text}
      avatar={avatar}
      heading={heading}
      onRetryClick={handleRetryClick}
    />
  );
}

export default memo(OpenAiMessage);
