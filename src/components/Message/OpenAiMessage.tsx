import { memo, useCallback, useEffect, useState } from "react";
import {
  Avatar,
  Box,
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
} from "@chakra-ui/react";
import { TbChevronDown } from "react-icons/tb";

import MessageBase, { type MessageBaseProps } from "./MessageBase";
import { ChatCraftChat } from "../../lib/ChatCraftChat";
import * as ai from "../../lib/ai";
import { useSettings } from "../../hooks/use-settings";
import { ChatCraftAiMessage, ChatCraftAiMessageVersion } from "../../lib/ChatCraftMessage";
import db from "../../lib/db";
import useSystemMessage from "../../hooks/use-system-message";
import { formatDate } from "../../lib/utils";

const getHeading = (model: GptModel) => {
  switch (model) {
    case "gpt-4":
      return "GPT - 4";
    case "gpt-3.5-turbo":
    // falls through
    default:
      return "ChatGPT";
  }
};

const getAvatar = (model: GptModel, size: "sm" | "xs") => {
  switch (model) {
    case "gpt-4":
      return <Avatar size={size} bg="#A96CF9" src={`/openai-logo.png`} title="GPT - 4" />;
    case "gpt-3.5-turbo":
    // falls through
    default:
      return <Avatar size={size} bg="#75AB9C" src={`/openai-logo.png`} title="ChatGPT" />;
  }
};

// If there are multiple versions in an AI message, add some UI to switch between them
function MessageVersionsMenu({
  message,
  isDisabled,
}: {
  message: ChatCraftAiMessage;
  isDisabled: boolean;
}) {
  const { versions } = message;
  if (versions?.length <= 1) {
    return null;
  }

  return (
    <Menu placement="bottom-end">
      <MenuButton
        as={IconButton}
        size="xs"
        variant="ghost"
        isDisabled={isDisabled}
        icon={<TbChevronDown title={`${versions.length} Versions`} />}
      >
        Versions
      </MenuButton>
      <MenuList>
        {versions
          .sort((a, b) => b.date.getTime() - a.date.getTime())
          .map((version) => {
            const { id, model, date } = version;

            return (
              <MenuItem
                key={id}
                value={id}
                onClick={() => message.switchVersion(id)}
                icon={getAvatar(model, "xs")}
              >
                <HStack>
                  <Box>
                    <strong>{getHeading(model)}</strong>
                  </Box>
                  <Box>{formatDate(date)}</Box>
                  <Box>{message.currentVersion?.id === id ? <strong>✓</strong> : " "}</Box>
                </HStack>
              </MenuItem>
            );
          })}
      </MenuList>
    </Menu>
  );
}

type OpenAiMessageProps = Omit<MessageBaseProps, "avatar" | "message"> & {
  message: ChatCraftAiMessage;
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

  return (
    <MessageBase
      {...props}
      message={message}
      hidePreviews={retrying}
      avatar={getAvatar(message.model, "sm")}
      heading={retrying ? `${getHeading(message.model)} (retrying...)` : getHeading(message.model)}
      headingMenu={<MessageVersionsMenu message={message} isDisabled={retrying} />}
      onRetryClick={retrying ? undefined : handleRetryClick}
      onDeleteClick={retrying ? undefined : props.onDeleteClick}
      disableFork={retrying}
      disableEdit={retrying}
    />
  );
}

export default memo(OpenAiMessage);
