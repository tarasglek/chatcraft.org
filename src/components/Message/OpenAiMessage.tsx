import { memo, useCallback, useEffect, useState } from "react";
import { Avatar, Button, Menu, MenuButton, MenuItem, MenuList } from "@chakra-ui/react";
import { TbChevronDown } from "react-icons/tb";

import MessageBase, { type MessageBaseProps } from "./MessageBase";
import { ChatCraftChat } from "../../lib/ChatCraftChat";
import * as ai from "../../lib/ai";
import { useSettings } from "../../hooks/use-settings";
import { ChatCraftAiMessage, ChatCraftAiMessageVersion } from "../../lib/ChatCraftMessage";
import db from "../../lib/db";
import useSystemMessage from "../../hooks/use-system-message";

type OpenAiMessageProps = Omit<MessageBaseProps, "avatar" | "message"> & {
  message: ChatCraftAiMessage;
};

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
  // We may or many not need to adjust the message (e.g., when retrying)
  const [message, setMessage] = useState(props.message);
  const [retrying, setRetrying] = useState(false);
  const { settings } = useSettings();
  const systemMessage = useSystemMessage();

  useEffect(() => {
    setMessage(props.message);
  }, [props.message]);

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

        const idx = chat.messages.findIndex((m) => m.id === message.id);
        if (!idx) {
          throw new Error(`Unable to find message within chat with id=${message.id}`);
        }
        const context = chat.messages.slice(0, idx);

        const date = new Date();
        const { id, versions } = message;
        setMessage(new ChatCraftAiMessage({ id, date, model, text: "", versions }));

        setRetrying(true);
        const newVersionText = await ai.chat(context, {
          apiKey: settings.apiKey,
          model: settings.model,
          onToken(_token: string, currentText: string) {
            setMessage(new ChatCraftAiMessage({ id, date, model, text: currentText, versions }));
          },
          systemMessage,
        });

        // Update db with new message info, and also add this as a new version
        await db.messages.update(message.id, {
          date,
          model,
          text: newVersionText,
          versions: [
            ...message.versions,
            new ChatCraftAiMessageVersion({ date, model, text: newVersionText }),
          ],
        });
      } catch (err) {
        // TODO: UI error handling
        console.warn("Unable to retry message", { model, err });
      } finally {
        setRetrying(false);
      }
    },
    [props.chatId, settings.apiKey, settings.model, message, systemMessage]
  );

  // If there are multiple versions in an AI message, add some UI to switch between them
  const versionsDropDown =
    message.versions?.length > 1 ? (
      <Menu>
        <MenuButton as={Button} size="xs" variant="outline" rightIcon={<TbChevronDown />}>
          Versions
        </MenuButton>
        <MenuList>
          {message.versions.map((version) => {
            const { id, model } = version;

            // Name each version for the model, and try to identify which one is the current
            let name = getHeading(model);
            if (message.currentVersion?.id === id) {
              name += " (current)";
            }

            return (
              <MenuItem key={id} value={id} onClick={() => message.switchVersion(id)}>
                {name}
              </MenuItem>
            );
          })}
        </MenuList>
      </Menu>
    ) : null;

  return (
    <MessageBase
      {...props}
      message={message}
      hidePreviews={retrying}
      avatar={getAvatar(message.model)}
      heading={retrying ? `${getHeading(message.model)} (retrying...)` : getHeading(message.model)}
      headingComponent={versionsDropDown}
      onRetryClick={retrying ? undefined : handleRetryClick}
      onDeleteClick={retrying ? undefined : props.onDeleteClick}
      disableFork={retrying}
      disableEdit={retrying}
    />
  );
}

export default memo(OpenAiMessage);
