import { memo } from "react";

import { Avatar } from "@chakra-ui/react";
import { LuFunctionSquare } from "react-icons/lu";

import MessageBase, { type MessageBaseProps } from "./MessageBase";
import { formatFunctionName } from "../../lib/ChatCraftFunction";
import { ChatCraftFunctionResultMessage } from "../../lib/ChatCraftMessage";

type FunctionMessageProps = Omit<MessageBaseProps, "avatar" | "message"> & {
  message: ChatCraftFunctionResultMessage;
};

function FunctionResultMessage(props: FunctionMessageProps) {
  const { message, ...rest } = props;
  const functionName = formatFunctionName(message.func.id, message.func.name);

  const avatar = (
    <Avatar
      size="sm"
      icon={<LuFunctionSquare fontSize="1.3rem" />}
      bg="orange.500"
      title={functionName}
    />
  );
  return (
    <MessageBase
      {...rest}
      message={message}
      avatar={avatar}
      heading={`Result: ${functionName}`}
      disableFork={true}
      disableEdit={true}
    />
  );
}

export default memo(FunctionResultMessage);
