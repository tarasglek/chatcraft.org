import { useState } from "react";
import {
  Button,
  Flex,
  FormControl,
  ModalBody,
  VStack,
  Text,
  Textarea,
  Tooltip,
  Heading,
} from "@chakra-ui/react";
import debounce from "lodash-es/debounce";

import { useSettings } from "../../hooks/use-settings";
import { defaultSystemPrompt } from "../../lib/system-prompt";

function DefaultSystemPrompt() {
  const [prompt, setPrompt] = useState(defaultSystemPrompt());
  const { settings, setSettings } = useSettings();

  // Update the default prompt, but not on every keystroke
  const handleSave = debounce((value: string) => {
    setSettings({ ...settings, customSystemPrompt: value });
  }, 250);

  // When the prompt changes, update state, and trigger a save for later
  const handleUpdate = (value: string) => {
    setPrompt(value);
    handleSave(value);
  };

  // Reset the default system prompt back to the app's default
  const handleReset = () => {
    setSettings({ ...settings, customSystemPrompt: undefined });
    setPrompt(defaultSystemPrompt());
  };

  return (
    <ModalBody>
      <VStack gap={4} mt={3}>
        <Text>
          The default system prompt is used as the first message in every chat. It provides the LLM
          important context, behavioral cues, and expectations about responses and desired response
          formats.
        </Text>

        <Text as="em" fontSize="sm">
          NOTE: changes to the default system prompt will take effect in new chats, but won&apos;t
          affect existing ones.
        </Text>

        <Heading size={"md"} width={"100%"} fontWeight={"normal"}>
          Default System Prompt
        </Heading>
        <FormControl>
          <Textarea
            autoFocus
            variant="filled"
            rows={16}
            value={prompt}
            onChange={(e) => handleUpdate(e.target.value)}
          />
        </FormControl>
        <Flex w="100%" justifyContent="flex-end">
          <Tooltip hasArrow placement="left" label="Reset to the default ChatCraft system prompt">
            <Button size="sm" colorScheme="red" onClick={() => handleReset()}>
              Reset
            </Button>
          </Tooltip>
        </Flex>
      </VStack>
    </ModalBody>
  );
}

export default DefaultSystemPrompt;
