import { memo } from "react";
import { Avatar, Button, Flex, useDisclosure } from "@chakra-ui/react";

import MessageBase, { type MessageBaseProps } from "./MessageBase";

type HumanMessageProps = Omit<MessageBaseProps, "avatar"> & { avatarUrl?: string; name?: string };

function HumanMessage(props: HumanMessageProps) {
  const { avatarUrl, message, name, ...rest } = props;
  const { isOpen, onToggle } = useDisclosure();

  // If we're showing the whole prompt, don't bother with the "More..." button
  const footer = (
    <Flex w="100%" justify="space-between" align="center">
      <Button size="sm" variant="ghost" onClick={() => onToggle()}>
        {isOpen ? "Show Less" : "Show More..."}
      </Button>
    </Flex>
  );

  // If we have a user's name and GitHub avatar, use that.
  const avatar = avatarUrl ? (
    <Avatar
      size="sm"
      src={avatarUrl}
      title={name}
      showBorder
      borderColor="gray.100"
      _dark={{ borderColor: "gray.600" }}
    />
  ) : (
    <Avatar size="sm" bg="gray.600" _dark={{ bg: "gray.500" }} />
  );

  const { text } = message;
  const textLines = text.split("\n");
  const veryLongMessage = textLines.length > 100 || textLines[0].length > 1000;
  const summaryText = textLines[0].slice(0, 250).trim() + "...";

  return (
    <MessageBase
      {...rest}
      message={message}
      avatar={avatar}
      heading={name}
      summaryText={!isOpen && veryLongMessage ? summaryText : undefined}
      footer={veryLongMessage ? footer : undefined}
    />
  );
}

export default memo(HumanMessage);
