import { memo } from "react";

import MessageBase, { type MessageBaseProps } from "../MessageBase";
import { ChatCraftAppMessage } from "../../../lib/ChatCraftMessage";

const AiGreetingText = "I am a helpful assistant! How can I help?";

function Greeting(props: MessageBaseProps) {
  // Override the text of the message
  const message = new ChatCraftAppMessage({ ...props.message, text: AiGreetingText });

  return <MessageBase {...props} message={message} />;
}

export default memo(Greeting);
