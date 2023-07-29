import { memo } from "react";

import { Avatar, Button, Checkbox, Flex, Text } from "@chakra-ui/react";
import { LuFunctionSquare } from "react-icons/lu";

import MessageBase, { type MessageBaseProps } from "./MessageBase";
import { formatFunctionName } from "../../lib/ChatCraftFunction";
import { ChatCraftFunctionResultMessage } from "../../lib/ChatCraftMessage";
import { useSettings } from "../../hooks/use-settings";

type FunctionMessageProps = Omit<MessageBaseProps, "avatar" | "message"> & {
  message: ChatCraftFunctionResultMessage;
};

function FunctionResultMessage(props: FunctionMessageProps) {
  const { message, onPrompt, ...rest } = props;
  const functionName = formatFunctionName(message.func.id, message.func.name);
  const { settings, setSettings } = useSettings();

  const avatar = (
    <Avatar
      size="sm"
      icon={<LuFunctionSquare fontSize="1.3rem" />}
      bg="orange.500"
      title={functionName}
    />
  );

  const footer = onPrompt && (
    <Flex justify="space-between" w="100%">
      <Text fontSize="sm">Send result for processing</Text>

      <Flex gap={2} align="center">
        <Checkbox
          isChecked={settings.alwaysSendFunctionResult}
          onChange={(e) => setSettings({ ...settings, alwaysSendFunctionResult: e.target.checked })}
          size="sm"
        >
          Always send
        </Checkbox>
        {!settings.alwaysSendFunctionResult && (
          <Button size="xs" onClick={() => onPrompt()}>
            Send
          </Button>
        )}
      </Flex>
    </Flex>
  );

  return (
    <MessageBase
      {...rest}
      message={message}
      avatar={avatar}
      footer={footer}
      heading={`Result: ${functionName}`}
      disableFork={true}
      disableEdit={true}
    />
  );
}

export default memo(FunctionResultMessage);
