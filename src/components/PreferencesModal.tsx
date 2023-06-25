import { FormEvent, RefObject, useCallback, useEffect, useState } from "react";
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
  Kbd,
  Checkbox,
  Link,
  ButtonGroup,
  useToast,
  FormErrorMessage,
} from "@chakra-ui/react";
import { exportDB } from "dexie-export-import";

import RevealablePasswordInput from "./RevealablePasswordInput";
import { useSettings } from "../hooks/use-settings";
import { download, isMac } from "../lib/utils";
import db from "../lib/db";
import { validateOpenAiApiKey } from "../lib/ai";

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
  const [isValidating, setIsValidating] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);
  const toast = useToast();

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

  const handleExportClick = useCallback(
    async function () {
      const blob = await exportDB(db);
      download(blob, "chatcraft-db.json", "application/json");
      toast({
        title: "Downloaded",
        description: "Database was downloaded as a file",
        status: "info",
        duration: 3000,
        position: "top",
        isClosable: true,
      });
    },
    [toast]
  );

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const updatedSettings = { ...settings };
    const data = new FormData(e.target as HTMLFormElement);

    // 1. See if the API Key is valid
    let apiKey = data.get("openai-api-key");
    if (typeof apiKey !== "string") {
      return;
    }
    apiKey = apiKey.trim();

    setIsValidating(true);
    try {
      if (await validateOpenAiApiKey(apiKey)) {
        setIsInvalid(false);
        updatedSettings.apiKey = apiKey;
      } else {
        setIsInvalid(true);
      }
    } catch (err) {
      console.warn("Error validating API Key", err);
      setIsInvalid(true);
    } finally {
      setIsValidating(false);
    }

    // 2. Update enter key behaviour
    const enterBehaviour = data.get("enter-behaviour");
    if (!(enterBehaviour === "send" || enterBehaviour === "newline")) {
      console.warn("Invalid enter behaviour", enterBehaviour);
    } else {
      updatedSettings.enterBehaviour = enterBehaviour;
    }

    // 3. Update enter key behaviour
    updatedSettings.countTokens = data.has("count-tokens");

    // 4. Update Just Some Me The Code behaviour
    updatedSettings.justShowMeTheCode = data.has("just-show-me-the-code");

    setSettings(updatedSettings);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" finalFocusRef={finalFocusRef}>
      <ModalOverlay />
      <ModalContent>
        <form onSubmit={handleSubmit}>
          <ModalHeader>User Settings</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack gap={4}>
              <FormControl isInvalid={isInvalid}>
                <FormLabel>
                  OpenAI API Key{" "}
                  <ButtonGroup ml={2}>
                    <Button
                      size="xs"
                      onClick={() => copyToClipboard(settings.apiKey || "")}
                      isDisabled={!settings.apiKey}
                    >
                      Copy
                    </Button>
                    <Button
                      size="xs"
                      colorScheme="red"
                      onClick={() => setSettings({ ...settings, apiKey: undefined })}
                      isDisabled={!settings.apiKey}
                    >
                      Remove
                    </Button>
                  </ButtonGroup>
                </FormLabel>
                <RevealablePasswordInput
                  type="password"
                  name="openai-api-key"
                  defaultValue={settings.apiKey || ""}
                />
                {isInvalid ? (
                  <FormErrorMessage>Unable to verify API Key with OpenAI.</FormErrorMessage>
                ) : (
                  <FormHelperText>Your API Key is stored in browser storage</FormHelperText>
                )}
              </FormControl>

              <FormControl>
                <FormLabel>
                  Offline database is {isPersisted ? "persisted" : "not persisted"}
                  <ButtonGroup ml={2}>
                    <Button size="xs" onClick={() => handlePersistClick()} isDisabled={isPersisted}>
                      Persist
                    </Button>
                    <Button size="xs" onClick={() => handleExportClick()}>
                      Export
                    </Button>
                  </ButtonGroup>
                </FormLabel>
                <FormHelperText>
                  Persisted databases use the{" "}
                  <Link
                    href="https://developer.mozilla.org/en-US/docs/Web/API/Storage_API"
                    textDecoration="underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Storage API
                  </Link>{" "}
                  and are retained by the browser as long as possible. See{" "}
                  <Link
                    href="https://dexie.org/docs/ExportImport/dexie-export-import"
                    textDecoration="underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    docs
                  </Link>{" "}
                  for database export details.
                </FormHelperText>
              </FormControl>

              <FormControl>
                <FormLabel>
                  When writing a prompt, press <Kbd>Enter</Kbd> to...
                </FormLabel>
                <RadioGroup defaultValue={settings.enterBehaviour} name="enter-behaviour">
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
                <Checkbox defaultChecked={settings.countTokens} name="count-tokens">
                  Track and Display Token Count and Cost
                </Checkbox>
              </FormControl>

              <FormControl>
                <Checkbox
                  defaultChecked={settings.justShowMeTheCode}
                  name="just-show-me-the-code"
                  onChange={(e) =>
                    setSettings({ ...settings, justShowMeTheCode: e.target.checked })
                  }
                >
                  Just show me the code, don&apos;t explain anything
                </Checkbox>
                <FormHelperText>
                  NOTE: this change will alter the default system prompt and be used for new chats
                  you create (i.e., it won&apos;t affect the current chat)
                </FormHelperText>
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <ButtonGroup w="100%" pt={4}>
              <Button ml="auto" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button size="sm" type="submit" isLoading={isValidating}>
                Save
              </Button>
            </ButtonGroup>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}

export default PreferencesModal;
