import { RefObject, useState } from "react";
import {
  Button,
  Flex,
  FormControl,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  VStack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import debounce from "lodash-es/debounce";

import { useSettings } from "../hooks/use-settings";
import { defaultSystemPrompt } from "../lib/system-prompt";

type DefaultSystemPromptModalProps = {
  isOpen: boolean;
  onClose: () => void;
  finalFocusRef?: RefObject<HTMLTextAreaElement>;
};

function DefaultSystemPromptModal({
  isOpen,
  onClose,
  finalFocusRef,
}: DefaultSystemPromptModalProps) {
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
    <Modal isOpen={isOpen} onClose={onClose} size="lg" finalFocusRef={finalFocusRef}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Default System Prompt</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack gap={4}>
            <Text fontSize="sm">
              The default system prompt is used as the first message in every chat. It provides the
              LLM important context, behavioral cues, and expectations about responses and desired
              response formats.
            </Text>

            <Text as="em" fontSize="sm">
              NOTE: changes to the default system prompt will take effect in new chats, but
              won&apos;t affect existing ones.
            </Text>

            <FormControl>
              <Textarea
                autoFocus
                rows={15}
                value={prompt}
                onChange={(e) => handleUpdate(e.target.value)}
              />
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Flex w="100%" justifyContent="space-between">
            <Text fontSize="sm">Reset to the default ChatCraft system prompt</Text>
            <Button size="xs" colorScheme="red" onClick={() => handleReset()}>
              Reset
            </Button>
          </Flex>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default DefaultSystemPromptModal;
