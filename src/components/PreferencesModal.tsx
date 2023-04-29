import {
  Button,
  FormControl,
  FormLabel,
  FormHelperText,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  RadioGroup,
  Radio,
  VStack,
  Stack,
  Select,
  Kbd,
  Checkbox,
} from "@chakra-ui/react";

import RevealablePasswordInput from "./RevealablePasswordInput";
import { useSettings } from "../hooks/use-settings";
import { isMac } from "../utils";

type PreferencesModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

function PreferencesModal({ isOpen, onClose }: PreferencesModalProps) {
  const { settings, setSettings } = useSettings();

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>User Settings</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack gap={2}>
              <FormControl>
                <FormLabel>
                  OpenAI API Key{" "}
                  <Button
                    ml={2}
                    size="xs"
                    colorScheme="red"
                    onClick={() => setSettings({ ...settings, apiKey: undefined })}
                    isDisabled={!settings.apiKey}
                  >
                    Remove
                  </Button>
                </FormLabel>
                <RevealablePasswordInput
                  type="password"
                  value={settings.apiKey || ""}
                  onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                />
                <FormHelperText>Your API Key is stored in browser storage</FormHelperText>
              </FormControl>

              <FormControl>
                <FormLabel>GPT Model</FormLabel>
                <Select
                  value={settings.model}
                  onChange={(e) => setSettings({ ...settings, model: e.target.value as GptModel })}
                >
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-3.5-turbo">ChatGPT (gpt-3.5-turbo)</option>
                </Select>
                <FormHelperText>NOTE: not all accounts have access to GPT-4</FormHelperText>
              </FormControl>

              <FormControl>
                <FormLabel>
                  When writing a prompt, press <Kbd>Enter</Kbd> to...
                </FormLabel>
                <RadioGroup
                  value={settings.enterBehaviour}
                  onChange={(nextValue) =>
                    setSettings({ ...settings, enterBehaviour: nextValue as EnterBehaviour })
                  }
                >
                  <Stack>
                    <Radio value="send">Send the message</Radio>
                    <Radio value="newline">
                      Start a new line (use {isMac() ? <Kbd>Command ⌘</Kbd> : <Kbd>Ctrl</Kbd>} +
                      <Kbd>Enter</Kbd> to send)
                    </Radio>
                  </Stack>
                </RadioGroup>
              </FormControl>

              <FormControl>
                <Checkbox
                  isChecked={settings.countTokens}
                  onChange={(e) => setSettings({ ...settings, countTokens: e.target.checked })}
                >
                  Track and Display Messages Token Count
                </Checkbox>
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter></ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

export default PreferencesModal;
