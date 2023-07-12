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
  useToast,
} from "@chakra-ui/react";
import { TbChevronDown } from "react-icons/tb";

import MessageBase, { type MessageBaseProps } from "./MessageBase";
import { ChatCraftChat } from "../../lib/ChatCraftChat";
import * as ai from "../../lib/ai";
import { useSettings } from "../../hooks/use-settings";
import { ChatCraftAiMessage, ChatCraftAiMessageVersion } from "../../lib/ChatCraftMessage";
import { formatDate } from "../../lib/utils";
import { ChatCraftModel } from "../../lib/ChatCraftModel";

const getAvatar = (model: ChatCraftModel, size: "sm" | "xs") => {
  if (model.id.startsWith("gpt-4")) {
    return <Avatar size={size} bg="#A96CF9" src={`/openai-logo.png`} title={model.prettyModel} />;
  }

  if (model.id.startsWith("gpt-3.5-turbo")) {
    return <Avatar size={size} bg="#75AB9C" src={`/openai-logo.png`} title={model.prettyModel} />;
  }

  // Shouldn't happen, but make sure we always return something...
  return <Avatar size={size} bg="#75AB9C" src={`/openai-logo.png`} title={model.prettyModel} />;
};

// If there are multiple versions in an AI message, add some UI to switch between them
// If there are multiple versions in an AI message, add some UI to switch between them
function MessageVersionsMenu({
  message,
  chatId,
  isDisabled,
}: {
  message: ChatCraftAiMessage;
  chatId: string;
  isDisabled: boolean;
}) {
  const toast = useToast();
  const { versions } = message;
  if (versions?.length <= 1) {
    return null;
  }

  const handleVersionChange = (versionId: string) => {
    message.switchVersion(versionId);
    message.save(chatId).catch((err) => {
      console.warn("Unable to switch versions", err);
      toast({
        title: `Error Updating Message to Version`,
        description: "message" in err ? err.message : undefined,
        status: "error",
        position: "top",
        isClosable: true,
      });
    });
  };

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
                onClick={() => handleVersionChange(id)}
                icon={getAvatar(model, "xs")}
              >
                <HStack>
                  <Box>
                    <strong>{model.prettyModel}</strong>
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

  useEffect(() => {
    setMessage(props.message);
  }, [props.message]);

  const handleRetryClick = useCallback(
    async (model: ChatCraftModel) => {
      if (!settings.apiKey) {
        return;
      }

      try {
        const chat = await ChatCraftChat.find(props.chatId);
        if (!chat) {
          throw new Error(`Unable to find chat with chatId=${props.chatId}`);
        }

        // Work with the messages, stripping out the app messages
        const messages = chat.messages({ includeAppMessages: false, includeSystemMessages: true });
        const idx = messages.findIndex((m) => m.id === message.id);
        if (!idx) {
          throw new Error(`Unable to find message within chat with id=${message.id}`);
        }
        const context = messages.slice(0, idx);
        const date = new Date();
        const { id, versions } = message;
        setMessage(new ChatCraftAiMessage({ id, date, model, text: "", versions }));

        setRetrying(true);
        const newVersionText = await ai.chat(context, {
          apiKey: settings.apiKey,
          model: model.id,
          onToken(_token: string, currentText: string) {
            setMessage(new ChatCraftAiMessage({ id, date, model, text: currentText, versions }));
          },
        });

        // Update db with new message info, and also add this as a new version
        const version = new ChatCraftAiMessageVersion({ date, model, text: newVersionText });
        message.addVersion(version);
        message.switchVersion(version.id);
        await message.save(chat.id);
      } catch (err) {
        // TODO: UI error handling
        console.warn("Unable to retry message", { model, err });
      } finally {
        setRetrying(false);
      }
    },
    [props.chatId, settings.apiKey, message]
  );

  return (
    <MessageBase
      {...props}
      message={message}
      hidePreviews={retrying}
      isLoading={props.isLoading || retrying}
      avatar={getAvatar(message.model, "sm")}
      heading={`${message.model.prettyModel} ${retrying ? ` (retrying...)` : ""}`}
      headingMenu={
        !message.readonly && (
          <MessageVersionsMenu message={message} chatId={props.chatId} isDisabled={retrying} />
        )
      }
      onRetryClick={retrying ? undefined : handleRetryClick}
      onDeleteClick={retrying ? undefined : props.onDeleteClick}
      disableFork={retrying}
      disableEdit={retrying}
    />
  );
}

export default memo(OpenAiMessage);
