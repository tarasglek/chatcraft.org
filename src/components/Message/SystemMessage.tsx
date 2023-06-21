import { memo, useMemo } from "react";
import { Avatar, Button, Flex, Text, useDisclosure } from "@chakra-ui/react";

import MessageBase, { type MessageBaseProps } from "./MessageBase";
import { isDefaultSystemPrompt, createSystemPromptSummary } from "../../lib/system-prompt";

type SystemMessageProps = Omit<MessageBaseProps, "avatar">;

function SystemMessage(props: SystemMessageProps) {
  const { message } = props;
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

  // If the user customizes the system prompt, we always show it.
  // However, if it's just the normal prompt, we truncate it to save space
  // but allow the user to click a "More..." button to reveal the whole thing.
  const { isOpen, onToggle } = useDisclosure();
  const isCustomSystemPrompt = useMemo(() => !isDefaultSystemPrompt(message), [message]);
  const summaryText = isCustomSystemPrompt ? undefined : createSystemPromptSummary();

  const footer = !isCustomSystemPrompt && (
    <Flex w="100%" justify="space-between" align="center">
      <Button size="sm" variant="ghost" onClick={() => onToggle()}>
        {isOpen ? "Less" : "More..."}
      </Button>
      <Text fontSize="2xs" as="em">
        Edit to customize
      </Text>
    </Flex>
  );

  return (
    <MessageBase
      {...props}
      avatar={avatar}
      heading="ChatCraft (System Prompt)"
      summaryText={!isOpen ? summaryText : undefined}
      footer={footer}
    />
  );
}

export default memo(SystemMessage);
