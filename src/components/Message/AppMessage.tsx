import { memo } from "react";
import { Avatar } from "@chakra-ui/react";

import MessageBase, { type MessageBaseProps } from "./MessageBase";

type AppMessageProps = Omit<MessageBaseProps, "avatar">;

function AppMessage(props: AppMessageProps) {
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

  return <MessageBase {...props} avatar={avatar} heading="ChatCraft" />;
}

export default memo(AppMessage);
