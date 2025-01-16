import { lazy, memo } from "react";
import { Avatar } from "@chakra-ui/react";

import MessageBase, { type MessageBaseProps } from "../MessageBase";
import { ChatCraftAppMessage } from "../../../lib/ChatCraftMessage";
import Instructions from "./Instructions";
import Help from "./Help";
import { CommandsHelpCommand } from "../../../lib/commands/CommandsHelpCommand";

// Lazy-load Analytics, since it also pulls in Recharts
const Analytics = lazy(() => import("./Analytics"));

type AppMessageProps = Omit<MessageBaseProps, "avatar">;

function AppMessage(props: AppMessageProps) {
  const { message } = props;
  const heading = "ChatCraft";
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

  // See if this is one of the special app message types that needs its own UI
  if (ChatCraftAppMessage.isInstructions(message)) {
    return (
      <Instructions
        {...props}
        avatar={avatar}
        heading={heading}
        disableFork={true}
        disableEdit={true}
      />
    );
  }

  if (ChatCraftAppMessage.isHelp(message)) {
    return (
      <Help {...props} avatar={avatar} heading={heading} disableFork={true} disableEdit={true} />
    );
  }

  if (ChatCraftAppMessage.isCommandsHelp(message)) {
    return (
      <Help
        {...props}
        onlyCommands={true}
        queriedCommand={CommandsHelpCommand.getQueriedCommand(message.text)}
        avatar={avatar}
        heading={heading}
        disableFork={true}
        disableEdit={true}
      />
    );
  }

  if (ChatCraftAppMessage.isAnalytics(message)) {
    return <Analytics />;
  }

  // Otherwise, use a basic message type and show the text
  return (
    <MessageBase
      {...props}
      avatar={avatar}
      heading={heading}
      disableFork={true}
      disableEdit={true}
    />
  );
}

export default memo(AppMessage);
