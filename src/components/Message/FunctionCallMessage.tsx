import { memo } from "react";

import MessageBase, { type MessageBaseProps } from "./MessageBase";
import { ChatCraftFunctionCallMessage } from "../../lib/ChatCraftMessage";
import ModelAvatar from "../ModelAvatar";

type FunctionMessageProps = Omit<MessageBaseProps, "avatar" | "message"> & {
  message: ChatCraftFunctionCallMessage;
};

function FunctionCallMessage(props: FunctionMessageProps) {
  const { message, ...rest } = props;
  const { model } = message;

  return (
    <MessageBase
      {...rest}
      message={message}
      avatar={<ModelAvatar model={model} size="sm" />}
      heading={model.prettyModel}
      disableFork={true}
      disableEdit={true}
    />
  );
}

export default memo(FunctionCallMessage);
