import { ChangeEvent, RefObject, useCallback, useEffect, useRef, useState } from "react";
import { useCopyToClipboard, useDebounce } from "react-use";
import {
  Button,
  Box,
  FormControl,
  FormLabel,
  FormHelperText,
  Input,
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
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Kbd,
  Checkbox,
  Link,
  ButtonGroup,
  FormErrorMessage,
} from "@chakra-ui/react";

import RevealablePasswordInput from "./RevealablePasswordInput";
import { useSettings } from "../hooks/use-settings";
import { download, isMac } from "../lib/utils";
import db from "../lib/db";
import { useModels } from "../hooks/use-models";
import { ChatCraftModel } from "../lib/ChatCraftModel";
import { providerFromUrl, providerFromJSON, getSupportedProviders } from "../lib/providers";
import { OpenAiProvider } from "../lib/providers/OpenAiProvider";
import { OpenRouterProvider } from "../lib/providers/OpenRouterProvider";
import { validateApiKey } from "../lib/ai";
import { useAlert } from "../hooks/use-alert";

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
  finalFocusRef?: RefObject<HTMLTextAreaElement>;
};

function PreferencesModal({ isOpen, onClose, finalFocusRef }: PreferencesModalProps) {
  const { settings, setSettings } = useSettings();
  const { models } = useModels();
  // Using this hook vs. useClipboard() in Chakra to work around a bug
  const [, copyToClipboard] = useCopyToClipboard();
  // Whether our db is being persisted
  const [isPersisted, setIsPersisted] = useState(false);
  const { info, error } = useAlert();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isApiKeyInvalid, setIsApiKeyInvalid] = useState(false);
  const supportedProviders = getSupportedProviders();

  // Check the API Key, but debounce requests if user is typing
  useDebounce(
    () => {
      if (!settings.currentProvider?.apiKey) {
        setIsApiKeyInvalid(true);
      } else {
        validateApiKey(settings.currentProvider?.apiKey)
          .then((result: boolean) => setIsApiKeyInvalid(!result))
          .catch((err) => {
            console.warn("Error validating API key", err);
            setIsApiKeyInvalid(true);
          });
      }
    },
    500,
    [settings.currentProvider?.apiKey]
  );

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
      // Don't load this unless it's needed (150K)
      const { exportDB } = await import("dexie-export-import");
      const blob = await exportDB(db);
      download(blob, "chatcraft-db.json", "application/json");
      info({
        title: "Downloaded",
        message: "Message was downloaded as a file",
      });
    },
    [info]
  );

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const blob = new Blob([new Uint8Array(reader.result as ArrayBuffer)]);
          // Don't load this unless it's needed (150K)
          import("dexie-export-import")
            .then(({ importDB }) => importDB(blob))
            .then(() => {
              info({
                title: "Database Import",
                message: "Database imported successfully. You may need to refresh.",
              });
            })
            .catch((err) => {
              console.warn("Error importing db", err);
              error({
                title: "Database Import",
                message: "Unable to import database. See Console for more details.",
              });
            });
        };
        reader.readAsArrayBuffer(file);
      }
    },
    [error, info]
  );

  const handleImportClick = useCallback(
    function () {
      if (inputRef.current) {
        inputRef.current.click();
      }
    },
    [inputRef]
  );

  const handleProviderChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      // Get stored data from settings.providers array if exists
      const newProvider = settings.providers[e.target.value]
        ? providerFromJSON(settings.providers[e.target.value])
        : providerFromUrl(e.target.value);

      setSettings({
        ...settings,
        currentProvider: newProvider,
      });
    },
    [setSettings, settings]
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" finalFocusRef={finalFocusRef}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>User Settings</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {!supportedProviders ? (
            <Box>Loading providers...</Box>
          ) : (
            <VStack gap={4}>
              <FormControl>
                <FormLabel>API URL</FormLabel>
                <Select value={settings.currentProvider?.apiUrl} onChange={handleProviderChange}>
                  {Object.values(supportedProviders).map((provider) => (
                    <option key={provider.apiUrl} value={provider.apiUrl}>
                      {provider.name} ({provider.apiUrl})
                    </option>
                  ))}
                </Select>
                <FormHelperText>
                  Advanced option for use with other OpenAI-compatible APIs
                </FormHelperText>
              </FormControl>

              <FormControl isInvalid={isApiKeyInvalid}>
                <FormLabel>
                  {settings.currentProvider?.name} API Key{" "}
                  <ButtonGroup ml={2}>
                    <Button
                      size="xs"
                      onClick={() => copyToClipboard(settings.currentProvider?.apiKey || "")}
                      isDisabled={!settings.currentProvider?.apiKey}
                    >
                      Copy
                    </Button>
                    <Button
                      size="xs"
                      colorScheme="red"
                      onClick={async () => {
                        // Create provider that has no key
                        const newProvider = providerFromUrl(settings.currentProvider?.apiUrl);

                        // Get array with provider removed
                        const updatedProviders = { ...settings.providers };
                        if (updatedProviders[settings.currentProvider?.apiUrl]) {
                          delete updatedProviders[settings.currentProvider?.apiUrl];
                        }

                        setSettings({
                          ...settings,
                          providers: updatedProviders,
                          currentProvider: newProvider,
                        });
                      }}
                      isDisabled={!settings.currentProvider?.apiKey}
                    >
                      Remove
                    </Button>
                  </ButtonGroup>
                </FormLabel>
                <RevealablePasswordInput
                  type="password"
                  value={settings.currentProvider?.apiKey || ""}
                  onChange={async (e) => {
                    const newProvider = providerFromUrl(
                      settings.currentProvider?.apiUrl,
                      e.target.value
                    );

                    setSettings({
                      ...settings,
                      currentProvider: newProvider,
                      providers: {
                        ...settings.providers,
                        [newProvider.apiUrl]: newProvider,
                      },
                    });
                  }}
                />
                {settings.currentProvider instanceof OpenRouterProvider &&
                  !settings.currentProvider?.apiKey && (
                    <Button mt="3" size="sm" onClick={OpenRouterProvider.openRouterPkceRedirect}>
                      Get API key from OpenRouter{" "}
                    </Button>
                  )}

                <FormErrorMessage>
                  Unable to verify API Key with {settings.currentProvider?.name}.
                </FormErrorMessage>
                <FormHelperText>Your API Key is stored in browser storage</FormHelperText>
              </FormControl>

              <FormControl>
                <FormLabel>
                  Offline database is {isPersisted ? "persisted" : "not persisted"}
                  <ButtonGroup ml={2}>
                    <Button
                      size="xs"
                      onClick={() => handlePersistClick()}
                      isDisabled={isPersisted}
                      variant="outline"
                    >
                      Persist
                    </Button>
                    <Button size="xs" onClick={() => handleImportClick()}>
                      Import
                    </Button>
                    <Input
                      type="file"
                      ref={inputRef}
                      onChange={handleFileChange}
                      style={{ display: "none" }}
                    />
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
                <FormLabel>GPT Model</FormLabel>
                <Select
                  value={settings.model.id}
                  onChange={(e) =>
                    setSettings({ ...settings, model: new ChatCraftModel(e.target.value) })
                  }
                >
                  {models
                    .filter(
                      (model) =>
                        !(settings.currentProvider instanceof OpenAiProvider) ||
                        model.id.includes("gpt")
                    )
                    .map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.prettyModel}
                      </option>
                    ))}
                </Select>
                <FormHelperText>
                  See{" "}
                  <Link
                    href="https://platform.openai.com/docs/models/gpt-4"
                    textDecoration="underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    docs
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="https://openai.com/pricing"
                    textDecoration="underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    pricing
                  </Link>
                  . NOTE: not all accounts have access to GPT - 4
                </FormHelperText>
              </FormControl>

              <FormControl>
                <FormLabel>Temperature: {settings.temperature}</FormLabel>
                <Box px="5">
                  <Slider
                    value={settings.temperature}
                    onChange={(value) => setSettings({ ...settings, temperature: value })}
                    min={0}
                    max={2}
                    step={0.05}
                  >
                    <SliderTrack>
                      <SliderFilledTrack />
                    </SliderTrack>
                    <SliderThumb />
                  </Slider>
                </Box>
                <FormErrorMessage>Temperature must be a number between 0 and 2.</FormErrorMessage>
                <FormHelperText>
                  The temperature increases the randomness of the response (0.0 - 2.0).
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
            </VStack>
          )}
        </ModalBody>

        <ModalFooter></ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default PreferencesModal;
