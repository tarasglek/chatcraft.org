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
import { useAlert } from "../../hooks/use-alert";

function SystemPromptVersionsMenu({
  onChange,
  isStarred,
  onStarClick,
}: {
  onChange: (value: string) => void;
  isStarred: boolean;
  onStarClick: () => void;
}) {
  const prevSystemPrompts = useLiveQuery<string[], string[]>(
    async () => {
      // Get all starred System Messages, sorted by date
      const records = await db.messages
        .where("type")
        .equals("system")
        .and((m) => m.starred === true)
        .sortBy("date");
      if (!records) {
        return [];
      }

      // Create a unique set of prompt strings and return
      const uniq = new Set<string>();
      records.reverse().forEach((message) => {
        const { text } = message;
        uniq.add(text);
      });

      return Promise.resolve([defaultSystemPrompt(), ...uniq]);
    },
    [],
    []
  );

  const title = isStarred ? "Unstar System Prompt" : "Star System Prompt";

  return (
    <Flex align="center">
      <IconButton
        size="sm"
        aria-label={title}
        title={title}
        icon={isStarred ? <TbStarFilled /> : <TbStar />}
        variant="ghost"
        onClick={() => onStarClick()}
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

  const handleStarredChanged = () => {
    message.starred = !message.starred;
    message.save(chatId).catch((err) => {
      console.warn("Unable to update system prompt", err);
      error({
        title: `Error changing starred for System Prompt`,
        message: err.message,
      });
    });
  };

  return (
    <MessageBase
      {...props}
      avatar={avatar}
      heading="ChatCraft (System Prompt)"
      headingMenu={
        <SystemPromptVersionsMenu
          onChange={handleSystemPromptVersionChange}
          isStarred={!!message.starred}
          onStarClick={handleStarredChanged}
        />
      }
      summaryText={!isOpen ? summaryText : undefined}
      footer={footer}
    />
  );
}

export default memo(SystemMessage);
