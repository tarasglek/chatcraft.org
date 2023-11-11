import { memo } from "react";
import {
  Avatar,
  Button,
  Container,
  Divider,
  Flex,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { useLiveQuery } from "dexie-react-hooks";
import { TbChevronDown, TbStar, TbStarFilled } from "react-icons/tb";

import MessageBase, { type MessageBaseProps } from "./MessageBase";
import { createSystemPromptSummary, defaultSystemPrompt } from "../../lib/system-prompt";
import db from "../../lib/db";
import { ChatCraftSystemMessage } from "../../lib/ChatCraftMessage";
import { ChatCraftStarredText } from "../../lib/ChatCraftStarredText";
import { useAlert } from "../../hooks/use-alert";

function SystemPromptVersionsMenu({
  onChange,
  promptMessage,
}: {
  onChange: (value: string) => void;
  promptMessage: ChatCraftSystemMessage;
}) {
  const { error } = useAlert();

  const prevSystemPrompts = useLiveQuery<string[], string[]>(
    async () => {
      // Get all starred System Messages, sorted by date
      const records = await db.starred
        .orderBy("date")
        .toArray() // Retrieve all entries as an array
        .then((entries) => {
          // Map the array of entries to get an array of 'text' attributes
          return entries.map((entry) => entry.text);
        })
        .catch((error) => {
          console.error("Failed to query the starred table:", error);
        });
      if (!records) {
        return Promise.resolve([defaultSystemPrompt()]);
      }

      return Promise.resolve([defaultSystemPrompt(), ...records]);
    },
    [],
    []
  );

  const isStarredMessage = useLiveQuery<boolean>(async () => {
    return ChatCraftStarredText.check(promptMessage.text);
  }, [promptMessage]);

  const handleStarredChanged = () => {
    const starredText = new ChatCraftStarredText({ text: promptMessage.text });
    if (!isStarredMessage) {
      starredText.save().catch((err) => {
        console.warn("Unable to update system prompt", err);
        error({
          title: `Error changing starred for System Prompt`,
          message: err.message,
        });
      });
    } else {
      starredText.remove().catch((err) => {
        console.warn("Unable to update system prompt", err);
        error({
          title: `Error changing starred for System Prompt`,
          message: err.message,
        });
      });
    }
  };

  const title = isStarredMessage
    ? "Unstar System Prompt to forget it"
    : "Star System Prompt to save for future use";

  return (
    <Flex align="center">
      <IconButton
        size="sm"
        aria-label={title}
        title={title}
        icon={isStarredMessage ? <TbStarFilled /> : <TbStar />}
        variant="ghost"
        onClick={handleStarredChanged}
      />
      <Menu placement="bottom-end" isLazy={true}>
        <MenuButton
          as={IconButton}
          size="xs"
          variant="ghost"
          icon={<TbChevronDown title={`${prevSystemPrompts.length} Previous System Prompts`} />}
        />
        <MenuList>
          {prevSystemPrompts.map((systemPrompt, idx, arr) => (
            <MenuItem
              key={systemPrompt}
              value={systemPrompt}
              onClick={() => onChange(systemPrompt)}
            >
              <Container>
                <Text noOfLines={3} title={systemPrompt}>
                  {systemPrompt}
                </Text>
                {idx < arr.length - 1 && <Divider mt={4} />}
              </Container>
            </MenuItem>
          ))}
        </MenuList>
      </Menu>
    </Flex>
  );
}

type SystemMessageProps = Omit<MessageBaseProps, "avatar" | "message"> & {
  message: ChatCraftSystemMessage;
};

function SystemMessage(props: SystemMessageProps) {
  const { chatId, message, editing, onEditingChange } = props;
  const { isOpen, onToggle } = useDisclosure();
  const summaryText = createSystemPromptSummary(message);
  const { error } = useAlert();

  const avatar = (
    <Avatar
      size="sm"
      src="/apple-touch-icon.png"
      title="ChatCraft"
      showBorder
      borderColor="gray.100"
      _dark={{ borderColor: "gray.600" }}
    />
  );

  // If we're showing the whole prompt, don't bother with the "More..." button
  const footer =
    message.text.length > summaryText.length ? (
      !editing && (
        <Flex w="100%" justify="space-between" align="center">
          <Button size="sm" variant="ghost" onClick={() => onToggle()}>
            {isOpen ? "Show Less" : "Show More..."}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onEditingChange(true)}>
            <Text fontSize="xs" as="em">
              Edit to customize
            </Text>
          </Button>
        </Flex>
      )
    ) : (
      <Flex w="100%" justify="flex-end" align="center">
        {!editing && (
          <Button size="sm" variant="ghost" onClick={() => onEditingChange(true)}>
            <Text fontSize="xs" as="em">
              Edit to customize
            </Text>
          </Button>
        )}
      </Flex>
    );

  const handleSystemPromptVersionChange = (systemPrompt: string) => {
    message.text = systemPrompt;
    message.save(chatId).catch((err) => {
      console.warn("Unable to update system prompt", err);
      error({
        title: `Error Switching System Prompt`,
        message: err.message,
      });
    });
  };

  return (
    <MessageBase
      {...props}
      avatar={avatar}
      heading="System Prompt"
      headingMenu={
        <SystemPromptVersionsMenu
          onChange={handleSystemPromptVersionChange}
          promptMessage={message}
        />
      }
      summaryText={!isOpen ? summaryText : undefined}
      footer={footer}
    />
  );
}

export default memo(SystemMessage);
