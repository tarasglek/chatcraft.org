import { memo } from "react";
import { Avatar } from "@chakra-ui/react";

import MessageBase, { type MessageBaseProps } from "./MessageBase";

function HumanMessage(props: Omit<MessageBaseProps, "avatar">) {
  const avatar = <Avatar size="sm" bg="gray.600" _dark={{ bg: "gray.500" }} />;
  return <MessageBase {...props} avatar={avatar} />;
}

export default memo(HumanMessage);
