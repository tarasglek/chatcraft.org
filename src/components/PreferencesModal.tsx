import { RefObject, useEffect, useState } from "react";
import { useCopyToClipboard } from "react-use";
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
} from "@chakra-ui/react";

import RevealablePasswordInput from "./RevealablePasswordInput";
import { useSettings } from "../hooks/use-settings";
import { isMac } from "../lib/utils";

// https://dexie.org/docs/StorageManager
async function isStoragePersisted() {
  if (navigator.storage?.persisted) {
    return await navigator.storage.persisted();
  }

  return false;
}

type PreferencesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  finalFocusRef: RefObject<HTMLTextAreaElement>;
};

function PreferencesModal({ isOpen, onClose, finalFocusRef }: PreferencesModalProps) {
  const { settings, setSettings } = useSettings();
  // Using this hook vs. useClipboard() in Chakra to work around a bug
  const [, copyToClipboard] = useCopyToClipboard();
  // Whether our db is being persisted
  const [isPersisted, setIsPersisted] = useState(false);

  useEffect(() => {
    isStoragePersisted()
      .then((value) => setIsPersisted(value))
      .catch(console.error);
  }, []);

  async function handlePersistClick() {
    if (navigator.storage?.persist) {
      await navigator.storage.persist();
      const persisted = await isStoragePersisted();
      setIsPersisted(persisted);
    }
  }

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
                <Button
                  ml={2}
                  size="xs"
                  onClick={() => copyToClipboard(settings.apiKey || "")}
                  isDisabled={!settings.apiKey}
                >
                  Copy
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
                onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
              />
              <FormHelperText>Your API Key is stored in browser storage</FormHelperText>
            </FormControl>

            <FormControl>
              <FormLabel>
                Offline database is {isPersisted ? "persisted" : "not persisted"}
                <Button
                  ml={2}
                  size="xs"
                  onClick={() => handlePersistClick()}
                  isDisabled={isPersisted}
                >
                  Persist
                </Button>
              </FormLabel>
              <FormHelperText>
                Persisted databases use the{" "}
                <Link
                  href="https://developer.mozilla.org/en-US/docs/Web/API/Storage_API"
                  textDecoration="underline"
                >
                  Storage API
                </Link>{" "}
                and are retained by the browser as long as possible.
              </FormHelperText>
            </FormControl>

            <FormControl>
              <FormLabel>GPT Model</FormLabel>
              <Select
                value={settings.model}
                onChange={(e) => setSettings({ ...settings, model: e.target.value as GptModel })}
              >
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">ChatGPT (GPT-3.5-turbo)</option>
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
