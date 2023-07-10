import { memo } from "react";
import { Avatar, Button, Flex, Text, useDisclosure } from "@chakra-ui/react";

import MessageBase, { type MessageBaseProps } from "./MessageBase";
import { createSystemPromptSummary } from "../../lib/system-prompt";

type SystemMessageProps = Omit<MessageBaseProps, "avatar">;

function SystemMessage(props: SystemMessageProps) {
  const { message, editing, onEditingChange } = props;
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

  const { isOpen, onToggle } = useDisclosure();
  const summaryText = createSystemPromptSummary(message);

  // If we're showing the whole prompt, don't bother with the "More..." button
  const footer =
    message.text.length > summaryText.length ? (
      <Flex w="100%" justify="space-between" align="center">
        <Button size="sm" variant="ghost" onClick={() => onToggle()}>
          {isOpen ? "Less" : "More..."}
        </Button>
        {!editing && (
          <Button size="sm" variant="ghost" onClick={() => onEditingChange(true)}>
            <Text fontSize="2xs" as="em">
              Edit to customize
            </Text>
          </Button>
        )}
      </Flex>
    ) : (
      <Flex w="100%" justify="flex-end" align="center">
        {!editing && (
          <Button size="sm" variant="ghost" onClick={() => onEditingChange(true)}>
            <Text fontSize="2xs" as="em">
              Edit to customize
            </Text>
          </Button>
        )}
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
