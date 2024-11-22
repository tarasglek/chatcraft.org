import { useState } from "react";
import { Flex, VStack, Text, Textarea, Heading, Separator } from "@chakra-ui/react";
import { Field } from "../ui/field";
import { Button } from "../ui/button";
import { Tooltip } from "../ui/tooltip";
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
    <VStack gap={4} my={3}>
      <Text fontWeight={"bolder"}>
        The default system prompt is used as the first message in every chat. It provides the LLM
        important context, behavioral cues, and expectations about responses and desired response
        formats.
      </Text>

      <Text as="em" fontSize="xs" mr={"auto"} fontWeight={"medium"}>
        NOTE: changes to the default system prompt will take effect in new chats, but won&apos;t
        affect existing ones.
      </Text>

      <Heading size={"md"} width={"100%"} fontWeight={"medium"}>
        Default System Prompt
      </Heading>
      <Separator />
      <Field>
        <Textarea
          autoFocus
          variant={"outline"}
          rows={16}
          size={"sm"}
          shadow={"sm"}
          value={prompt}
          onChange={(e) => handleUpdate(e.target.value)}
        />
      </Field>
      <Flex w="100%" justifyContent="flex-end">
        <Tooltip
          showArrow
          positioning={{
            placement: "left",
          }}
          content="Reset to the default ChatCraft system prompt"
        >
          <Button size="sm" h={6} colorPalette={"red"} onClick={() => handleReset()}>
            Reset
          </Button>
        </Tooltip>
      </Flex>
    </VStack>
  );
}

export default DefaultSystemPrompt;
