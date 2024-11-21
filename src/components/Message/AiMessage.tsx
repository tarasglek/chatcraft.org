import { memo, useCallback, useEffect, useState } from "react";
import { Box, HStack, IconButton, Button, Group } from "@chakra-ui/react";
import { TbChevronDown } from "react-icons/tb";
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from "../ui/menu";

import MessageBase, { type MessageBaseProps } from "./MessageBase";
import { ChatCraftChat } from "../../lib/ChatCraftChat";
import { useSettings } from "../../hooks/use-settings";
import { ChatCraftAiMessage, ChatCraftAiMessageVersion } from "../../lib/ChatCraftMessage";
import { formatDate } from "../../lib/utils";
import { ChatCraftModel } from "../../lib/ChatCraftModel";
import useChatOpenAI from "../../hooks/use-chat-openai";
import NewMessage from "./NewMessage";
import ModelAvatar from "../ModelAvatar";
import { useAlert } from "../../hooks/use-alert";

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
  const { error } = useAlert();
  const { versions } = message;
  if (versions?.length <= 1) {
    return null;
  }

  const handleVersionChange = (versionId: string) => {
    message.switchVersion(versionId);
    message.save(chatId).catch((err) => {
      console.warn("Unable to switch versions", err);
      error({
        title: `Error Updating Message to Version`,
        message: err.message,
      });
    });
  };

  return (
    <MenuRoot>
      <MenuTrigger asChild>
        <Button as={IconButton} size="xs" variant="ghost" disabled={isDisabled}>
          <TbChevronDown title={`${versions.length} Versions`} />
          Versions
        </Button>
      </MenuTrigger>

      <MenuContent>
        <Group>
          {versions
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .map((version) => {
              const { id, model, date } = version;

              return (
                <MenuItem asChild value="version-select" key={id}>
                  <HStack>
                    <Box key={id} onClick={() => handleVersionChange(id)}>
                      <ModelAvatar model={model} size="xs" />
                      <strong>{model.prettyModel}</strong>
                    </Box>
                    <Box>{formatDate(date)}</Box>
                    <Box>{message.currentVersion?.id === id ? <strong>✓</strong> : " "}</Box>
                  </HStack>
                </MenuItem>
              );
            })}
        </Group>
      </MenuContent>
    </MenuRoot>
  );
}

type AiMessageProps = Omit<MessageBaseProps, "avatar" | "message"> & {
  message: ChatCraftAiMessage;
};

function AiMessage(props: AiMessageProps) {
  const { streamingMessage, callChatApi, cancel, paused, togglePause } = useChatOpenAI();
  // We may or many not need to adjust the message (e.g., when retrying)
  const [message, setMessage] = useState(props.message);
  const [retrying, setRetrying] = useState(false);
  const { settings } = useSettings();
  const { error } = useAlert();

  useEffect(() => {
    setMessage(props.message);
  }, [props.message]);

  const handleRetryClick = useCallback(
    async (model: ChatCraftModel) => {
      if (!settings.currentProvider.apiKey) {
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

        setRetrying(true);
        const aiMessage = await callChatApi(context, { model });

        // Update db with new message info, and also add this text as a new version
        const version = new ChatCraftAiMessageVersion({
          date,
          model: aiMessage.model,
          text: aiMessage.text,
        });
        message.addVersion(version);
        message.switchVersion(version.id);
        await message.save(chat.id);
      } catch (err: any) {
        error({
          title: `Retry Error`,
          message: err.message,
        });
        console.warn("Unable to retry message", { model, err });
      } finally {
        setRetrying(false);
      }
    },
    [props.chatId, settings.currentProvider.apiKey, message, callChatApi, error]
  );

  // While we're streaming in a new version, use a different display
  return streamingMessage ? (
    <NewMessage
      message={streamingMessage}
      chatId={props.chatId}
      isPaused={paused}
      onTogglePause={togglePause}
      onCancel={cancel}
    />
  ) : (
    <MessageBase
      {...props}
      key={message.id}
      message={message}
      hidePreviews={retrying}
      isLoading={props.isLoading || retrying}
      avatar={<ModelAvatar model={message.model} size="sm" />}
      heading={`${message.model.prettyModel} ${retrying ? ` (retrying...)` : ""}`}
      headingMenu={
        !message.readonly && (
          <MessageVersionsMenu message={message} chatId={props.chatId} isDisabled={retrying} />
        )
      }
      onRetryClick={retrying ? undefined : handleRetryClick}
      onDeleteClick={retrying ? undefined : props.onDeleteClick}
      disableFork={retrying}
      disableEdit={message.readonly ?? retrying}
    />
  );
}

export default memo(AiMessage);
