import db from "../../lib/db";
import MessageBase, { type MessageBaseProps } from "./MessageBase";
import { memo } from "react";
import { Box, Container, Separator as Divider, Flex, IconButton, Text } from "@chakra-ui/react";
import { MenuRoot, MenuItem, MenuItemGroup } from "../ui/menu";
import { Button } from "../ui/button";
import { Avatar } from "../ui/avatar";
import { useLiveQuery } from "dexie-react-hooks";
import { TbChevronDown, TbStar, TbStarFilled } from "react-icons/tb";
import { createSystemPromptSummary, defaultSystemPrompt } from "../../lib/system-prompt";
import { ChatCraftSystemMessage } from "../../lib/ChatCraftMessage";
import { ChatCraftStarredSystemPrompt } from "../../lib/ChatCraftStarredSystemPrompt";
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
        .orderBy("usage")
        .reverse()
        .toArray() // Retrieve all entries as an array
        .then((entries) => {
          // Map the array of entries to get an array of 'text' attributes
          return entries.map((entry) => entry.text);
        })
        .catch((error) => {
          console.error("Failed to query the starred table:", error);
        });
      if (!records) {
        return [defaultSystemPrompt()];
      }

      return records;
    },
    [],
    []
  );

  const isStarredSystemPrompt = useLiveQuery<boolean>(
    () =>
      ChatCraftStarredSystemPrompt.exists(promptMessage.text).catch((err) => {
        console.warn("Unable to query 'starred' table for PK", err);
        error({
          title: "Error while checking for presence of Starred System Prompt in db",
          message: err.message,
        });
        return false;
      }),
    [promptMessage]
  );

  const handleStarredChanged = () => {
    if (!isStarredSystemPrompt) {
      const starredText = new ChatCraftStarredSystemPrompt({ text: promptMessage.text });
      starredText.save().catch((err) => {
        console.warn("Unable to save text to 'starred' table", err);
        error({
          title: "Error while saving Starred System Prompt to db",
          message: err.message,
        });
      });
    } else {
      ChatCraftStarredSystemPrompt.delete(promptMessage.text).catch((err) => {
        console.warn("Unable to remove text from 'starred' table", err);
        error({
          title: "Error while removing Starred System Prompt from db",
          message: err.message,
        });
      });
    }
  };

  const title = isStarredSystemPrompt
    ? "Unstar System Prompt to forget it"
    : "Star System Prompt to save for future use";

  return (
    <Flex align="center">
      <IconButton
        size="sm"
        aria-label={title}
        title={title}
        variant="ghost"
        onClick={handleStarredChanged}
      >
        {isStarredSystemPrompt ? <TbStarFilled /> : <TbStar />}
      </IconButton>
      {prevSystemPrompts?.length != 0 && (
        <MenuRoot>
          <Button as={IconButton} size="sm" variant="ghost">
            <TbChevronDown title={`${prevSystemPrompts.length} Previous System Prompts`} />
          </Button>
          <MenuItemGroup zIndex={2} position={"bottom"}>
            {prevSystemPrompts.map((systemPrompt, idx, arr) => (
              <Box key={systemPrompt}>
                <MenuItem value={systemPrompt} onClick={() => onChange(systemPrompt)}>
                  <Container>
                    <Text lineClamp={3} my={2} title={systemPrompt}>
                      {systemPrompt}
                    </Text>
                  </Container>
                </MenuItem>
                {idx < arr.length - 1 && <Divider />}
              </Box>
            ))}
          </MenuItemGroup>
        </MenuRoot>
      )}
    </Flex>
  );
}

type SystemMessageProps = Omit<MessageBaseProps, "avatar" | "message"> & {
  message: ChatCraftSystemMessage;
};

function SystemMessage(props: SystemMessageProps) {
  const { chatId, message } = props;
  const summaryText = createSystemPromptSummary(message);
  const { error } = useAlert();

  const avatar = (
    <Avatar
      size="sm"
      src="/apple-touch-icon.png"
      title="ChatCraft"
      border={1}
      borderColor="gray.100"
      _dark={{ borderColor: "gray.600" }}
    />
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
      summaryText={summaryText}
    />
  );
}

export default memo(SystemMessage);
