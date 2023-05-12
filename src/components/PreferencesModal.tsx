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
  Link,
  useClipboard,
} from "@chakra-ui/react";

import RevealablePasswordInput from "./RevealablePasswordInput";
import { useSettings } from "../hooks/use-settings";
import { isMac } from "../utils";
import { ChangeEvent, RefObject } from "react";

type PreferencesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  finalFocusRef: RefObject<HTMLTextAreaElement>;
};

const MODELS = {
  "gpt-4": "GPT-4",
  "gpt-3.5-turbo": "ChatGPT (GPT-3.5-turbo)",
  "claude-v1": "claude-v1",
  "claude-v1-100k": "claude-v1-100k",
  "claude-instant-v1": "claude-instant-v1 Smaller/Lower Latency",
  "claude-instant-v1-100k": "claude-instant-v1-100k Faster, full 100k model",
};

function PreferencesModal({ isOpen, onClose, finalFocusRef }: PreferencesModalProps) {
  const { onCopy, setValue, hasCopied } = useClipboard("");
  const { settings, setSettings } = useSettings();

  const handleApiKeyChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setValue(value);
    setSettings({ ...settings, apiKey: value });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" finalFocusRef={finalFocusRef}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>User Settings</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack gap={2}>
            <FormControl>
              <FormLabel>
                OpenAI API Key{" "}
                <Button ml={2} size="xs" onClick={() => onCopy()} isDisabled={!settings.apiKey}>
                  {hasCopied ? <span>&#10003; Copied</span> : "Copy"}
                </Button>
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
                onChange={handleApiKeyChange}
              />
              <FormHelperText>Your API Key is stored in browser storage</FormHelperText>
            </FormControl>

            <FormControl>
              <FormLabel>GPT Model</FormLabel>
              <Select
                value={settings.model}
                onChange={(e) => setSettings({ ...settings, model: e.target.value as GptModel })}
              >
                {Object.entries(MODELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <FormHelperText>
                See{" "}
                <Link
                  href="https://platform.openai.com/docs/models/gpt-4"
                  textDecoration="underline"
                >
                  docs
                </Link>{" "}
                and{" "}
                <Link href="https://openai.com/pricing" textDecoration="underline">
                  pricing
                </Link>
                . NOTE: not all accounts have access to GPT-4
              </FormHelperText>
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
                Track and Display Token Count and Cost
              </Checkbox>
            </FormControl>

            <FormControl>
              <Checkbox
                isChecked={settings.justShowMeTheCode}
                onChange={(e) => setSettings({ ...settings, justShowMeTheCode: e.target.checked })}
              >
                Just show me the code, don&apos;t explain anything
              </Checkbox>
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter></ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default PreferencesModal;
