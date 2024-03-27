import {
  Box,
  Button,
  ButtonGroup,
  Checkbox,
  Flex,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  IconButton,
  Input,
  Kbd,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Radio,
  RadioGroup,
  Select,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Stack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Tooltip,
  useToast,
  VStack,
  InputGroup,
} from "@chakra-ui/react";
import { ChangeEvent, RefObject, useCallback, useEffect, useRef, useState } from "react";
import { useDebounce } from "react-use";

import { capitalize } from "lodash-es";
import { MdVolumeUp } from "react-icons/md";
import { useAlert } from "../hooks/use-alert";
import useAudioPlayer from "../hooks/use-audio-player";
import { useModels } from "../hooks/use-models";
import { useSettings } from "../hooks/use-settings";
import { ChatCraftModel } from "../lib/ChatCraftModel";
import { textToSpeech } from "../lib/ai";
import db from "../lib/db";
import { getSupportedProviders } from "../lib/providers";
import { OpenAiProvider } from "../lib/providers/OpenAiProvider";
import { OpenRouterProvider } from "../lib/providers/OpenRouterProvider";
import { TextToSpeechVoices } from "../lib/settings";
import { download, isMac } from "../lib/utils";
import RevealablePasswordInput from "./RevealablePasswordInput";
import { CustomProvider } from "../lib/providers/CustomProvider";
import { ChatCraftProvider, ProviderData } from "../lib/ChatCraftProvider";

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
  // const [, copyToClipboard] = useCopyToClipboard();
  // Whether our db is being persisted
  const [isPersisted, setIsPersisted] = useState(false);
  const { info, error } = useAlert();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isApiKeyInvalid, setIsApiKeyInvalid] = useState(false);
  const supportedProviders = getSupportedProviders();
  const [providers, setProviders] = useState<ProviderData>({});
  const toast = useToast();
  const [selectedProviders, setSelectedProviders] = useState<Set<string>>(new Set());
  const [newProvider, setNewProvider] = useState<ChatCraftProvider | null>(null);
  const [nameError, setNameError] = useState("");
  const [apiUrlError, setApiUrlError] = useState("");
  const [apiKeyError, setApiKeyError] = useState("");
  const [focusedProviderName, setFocusedProviderName] = useState("");
  const [apiKeySaved, setApiKeySaved] = useState(false);

  useEffect(() => {
    setProviders({ ...supportedProviders, ...settings.providers });
  }, [settings.providers, supportedProviders]);

  const handleApiChange = (name: string, newApiKey: string) => {
    const updatedProviders = { ...providers };
    if (updatedProviders[name]) {
      updatedProviders[name].apiKey = newApiKey;
      setProviders(updatedProviders);

      const updatedSettingsProviders = { ...settings.providers };
      updatedSettingsProviders[name] = updatedProviders[name];
      setSettings({ ...settings, providers: updatedSettingsProviders });
    }
    setApiKeySaved(true);
  };

  const handleSetDefaultProvider = (name: string) => {
    const provider = providers[name];
    if (provider) {
      setSettings({ ...settings, currentProvider: provider });
    }
  };

  const handleProviderSelectionChange = (name: string, isSelected: boolean) => {
    const newSelectedProviders = new Set(selectedProviders);
    if (isSelected) {
      newSelectedProviders.add(name);
    } else {
      newSelectedProviders.delete(name);
    }
    setSelectedProviders(newSelectedProviders);
  };

  const handleAddProvider = () => {
    const tempNewProvider = new CustomProvider("", "", "");
    setNewProvider(tempNewProvider);
  };

  const handleDeleteSelectedProviders = () => {
    if (selectedProviders.has(settings.currentProvider.name)) {
      toast({
        title: "Error",
        description: "You cannot delete the default provider.",
        status: "error",
        duration: 2000,
        isClosable: true,
        position: "top",
      });
      return;
    }

    const updatedProviders = { ...providers };
    selectedProviders.forEach((name) => {
      delete updatedProviders[name];
      setProviders(updatedProviders);
      setSelectedProviders(new Set());
      setSettings({ ...settings, providers: updatedProviders });
    });

    setProviders(updatedProviders);
    setSelectedProviders(new Set());
    setSettings({ ...settings, providers: updatedProviders });
  };

  // Check the API Key, but debounce requests if user is typing
  useDebounce(
    () => {
      if (!settings.currentProvider.apiKey) {
        setIsApiKeyInvalid(true);
      } else {
        settings.currentProvider
          .validateApiKey(settings.currentProvider.apiKey)
          .then((result: boolean) => setIsApiKeyInvalid(!result))
          .catch((err) => {
            console.warn("Error validating API key", err);
            setIsApiKeyInvalid(true);
          });
      }
    },
    500,
    [settings.currentProvider.apiKey]
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

  // const handleProviderChange = useCallback(
  //   (e: ChangeEvent<HTMLSelectElement>) => {
  //     const url = nameToUrlMap[e.target.value];

  //     // Get stored data from settings.providers array if exists
  //     const newProvider = settings.providers[e.target.value]
  //       ? settings.providers[e.target.value]
  //       : providerFromUrl(url, e.target.value);

  //     if (newProvider instanceof FreeModelProvider) {
  //       // If user chooses the free provider, set the key automatically
  //       setSettings({
  //         ...settings,
  //         currentProvider: new FreeModelProvider(),
  //       });
  //     } else {
  //       setSettings({
  //         ...settings,
  //         currentProvider: newProvider,
  //       });
  //     }
  //   },
  //   [setSettings, settings]
  // );

  const handleVoiceSelection = useCallback(
    (voice: TextToSpeechVoices) => {
      setSettings({
        ...settings,
        textToSpeech: {
          ...settings.textToSpeech,
          voice,
        },
      });
    },
    [setSettings, settings]
  );

  const { clearAudioQueue, addToAudioQueue } = useAudioPlayer();

  const handlePlayAudioPreview = useCallback(async () => {
    try {
      const { voice } = settings.textToSpeech;
      const previewText = `Hi there, this is ${voice}!`;

      clearAudioQueue();
      addToAudioQueue(textToSpeech(previewText, voice));
    } catch (err: any) {
      console.error(err);
      error({ title: "Error while generating Audio", message: err.message });
    }
  }, [addToAudioQueue, clearAudioQueue, error, settings.textToSpeech]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" finalFocusRef={finalFocusRef}>
      <ModalOverlay />
      <ModalContent maxW="700px">
        <ModalHeader>User Settings</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {!supportedProviders || !providers ? (
            <Box>Loading providers...</Box>
          ) : (
            <VStack gap={4}>
              <FormControl>
                <FormLabel>
                  Providers
                  <ButtonGroup ml={2}>
                    <Button
                      size="xs"
                      onClick={handleAddProvider}
                      isDisabled={!settings.currentProvider.apiKey}
                    >
                      Add
                    </Button>
                    <Button
                      size="xs"
                      colorScheme="red"
                      onClick={handleDeleteSelectedProviders}
                      isDisabled={selectedProviders.size === 0}
                    >
                      Delete
                    </Button>
                  </ButtonGroup>
                  <FormHelperText fontSize="xs">
                    Advanced option for use with other OpenAI-compatible APIs
                  </FormHelperText>
                </FormLabel>
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th></Th>
                      <Th>Name</Th>
                      <Th>API URL</Th>
                      <Th>API Key</Th>
                      <Th>Default</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {newProvider && (
                      <Tr>
                        <Td sx={{ maxWidth: "30px" }}>
                          <Checkbox isDisabled={true} />
                        </Td>
                        <Td sx={{ maxWidth: "110px" }}>
                          <FormControl isInvalid={!!nameError}>
                            <InputGroup size="sm">
                              <Input
                                fontSize="xs"
                                placeholder="Provider Name"
                                value={newProvider.name}
                                onChange={(e) => {
                                  setNewProvider(
                                    new CustomProvider(
                                      e.target.value,
                                      newProvider.apiUrl,
                                      newProvider.apiKey
                                    )
                                  );
                                  setNameError("");
                                }}
                              />
                            </InputGroup>
                            <FormErrorMessage fontSize="xs">{nameError}</FormErrorMessage>
                          </FormControl>
                        </Td>
                        <Td sx={{ maxWidth: "190px" }}>
                          <FormControl isInvalid={!!apiUrlError}>
                            <InputGroup size="sm">
                              <Input
                                fontSize="xs"
                                placeholder="API URL"
                                value={newProvider.apiUrl}
                                onChange={(e) => {
                                  setNewProvider(
                                    new CustomProvider(
                                      newProvider.name,
                                      e.target.value,
                                      newProvider.apiKey
                                    )
                                  );
                                  setApiUrlError("");
                                }}
                              />
                            </InputGroup>
                            <FormErrorMessage fontSize="xs">{apiUrlError}</FormErrorMessage>
                          </FormControl>
                        </Td>
                        <Td>
                          <FormControl isInvalid={!!apiKeyError}>
                            <RevealablePasswordInput
                              fontSize="xs"
                              type="password"
                              placeholder="API Key"
                              value={newProvider.apiKey || ""}
                              onChange={(e) => {
                                setNewProvider(
                                  new CustomProvider(
                                    newProvider.name,
                                    newProvider.apiUrl,
                                    e.target.value
                                  )
                                );
                              }}
                            />
                            <FormErrorMessage fontSize="xs">{apiKeyError}</FormErrorMessage>
                          </FormControl>
                        </Td>
                        <Td>
                          <Button
                            size="xs"
                            colorScheme="green"
                            onClick={() => {
                              if (newProvider) {
                                setNameError("");
                                setApiUrlError("");
                                setApiKeyError("");

                                const name = newProvider.name.trim();
                                const apiUrl = newProvider.apiUrl.trim();
                                const apiKey = newProvider.apiKey?.trim();

                                let isValid = true;

                                if (!name) {
                                  setNameError("Provider Name is required");
                                  isValid = false;
                                }
                                if (!apiUrl) {
                                  setApiUrlError("API URL is required");
                                  isValid = false;
                                }
                                if (!apiKey) {
                                  setApiKeyError("API Key is required");
                                  isValid = false;
                                }
                                if (!isValid) return;

                                if (!name || !apiUrl || !apiKey) {
                                  toast({
                                    title: "Error",
                                    description: "All fields must be filled out.",
                                    status: "error",
                                    duration: 2000,
                                    isClosable: true,
                                    position: "top",
                                  });
                                  return;
                                }

                                // Check if provider name already exists
                                if (providers[name]) {
                                  toast({
                                    title: "Error",
                                    description: "A provider with this name already exists.",
                                    status: "error",
                                    duration: 2000,
                                    isClosable: true,
                                    position: "top",
                                  });
                                  return;
                                }

                                // Create a new provider instance with trimmed apiUrl
                                const providerToSave = new CustomProvider(name, apiUrl, apiKey);

                                const updatedProviders = {
                                  ...providers,
                                  [name]: providerToSave,
                                };

                                setProviders(updatedProviders);

                                const updatedSettingsProviders = {
                                  ...settings.providers,
                                  [newProvider.name]: providerToSave,
                                };
                                setSettings({ ...settings, providers: updatedSettingsProviders });

                                // clear the form and hide the new provider row
                                setNewProvider(null);

                                setApiKeySaved(true);
                              }
                            }}
                          >
                            Save
                          </Button>
                        </Td>
                      </Tr>
                    )}
                    {[...Object.values(providers)] // copy of the array
                      .reverse() // reverse the array so new provider is at top
                      .map((provider, index) => (
                        <Tr key={index}>
                          <Td sx={{ maxWidth: "30px" }}>
                            {!(provider.name in supportedProviders) && (
                              <Checkbox
                                onChange={(e) =>
                                  handleProviderSelectionChange(provider.name, e.target.checked)
                                }
                                isChecked={selectedProviders.has(provider.name)}
                              />
                            )}
                          </Td>
                          <Td fontSize="xs" sx={{ maxWidth: "110px" }}>
                            {provider.name}
                          </Td>
                          <Td fontSize="xs" sx={{ maxWidth: "190px" }}>
                            {provider.apiUrl}
                          </Td>
                          <Td>
                            {provider.name === "Free AI Models" ? (
                              <InputGroup size="sm">
                                <Input disabled fontSize="xs" value="N/A" />
                              </InputGroup>
                            ) : (
                              <FormControl
                                isInvalid={
                                  settings.currentProvider.name === provider.name && isApiKeyInvalid
                                }
                              >
                                <RevealablePasswordInput
                                  fontSize="xs"
                                  type="password"
                                  value={provider.apiKey || ""}
                                  onChange={(e) => handleApiChange(provider.name, e.target.value)}
                                  onFocus={() => setFocusedProviderName(provider.name)}
                                  onBlur={() => setFocusedProviderName("")}
                                  isDisabled={provider.name === "Free AI Models"}
                                />
                                {settings.currentProvider.name === provider.name &&
                                  isApiKeyInvalid && (
                                    <FormErrorMessage fontSize="xs">
                                      Unable to verify API Key with {settings.currentProvider.name}.
                                    </FormErrorMessage>
                                  )}
                                {provider.name === "OpenRouter.ai" &&
                                  provider.name === focusedProviderName && (
                                    <Button
                                      mt="3"
                                      size="xs"
                                      onClick={() => {
                                        const provider = providers["OpenRouter.ai"];
                                        if (provider instanceof OpenRouterProvider) {
                                          provider.openRouterPkceRedirect();
                                        } else {
                                          console.error("Provider is not an OpenRouterProvider");
                                        }
                                      }}
                                    >
                                      Get API key from OpenRouter{" "}
                                    </Button>
                                  )}
                              </FormControl>
                            )}
                          </Td>
                          <Td>
                            <Button
                              size="xs"
                              isDisabled={settings.currentProvider.name === provider.name}
                              onClick={() => handleSetDefaultProvider(provider.name)}
                            >
                              {settings.currentProvider.name === provider.name ? "Default" : "Set"}
                            </Button>
                          </Td>
                        </Tr>
                      ))}
                  </Tbody>
                </Table>
                <FormErrorMessage>
                  Unable to verify API Key with {settings.currentProvider.name}.
                </FormErrorMessage>
                {apiKeySaved && (
                  <FormHelperText fontSize="xs">
                    Your API Key is stored in browser storage
                  </FormHelperText>
                )}
              </FormControl>

              {/* <FormControl>
                <FormLabel>API URL</FormLabel>
                <Select value={settings.currentProvider.name} onChange={handleProviderChange}>
                  {Object.values(supportedProviders).map((provider) => (
                    <option key={provider.name} value={provider.name}>
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
                  {settings.currentProvider.name} API Key{" "}
                  <ButtonGroup ml={2}>
                    <Button
                      size="xs"
                      onClick={() => copyToClipboard(settings.currentProvider.apiKey || "")}
                      isDisabled={!settings.currentProvider.apiKey}
                    >
                      Copy
                    </Button>
                    <Button
                      size="xs"
                      colorScheme="red"
                      onClick={() => {
                        // Create provider that has no key
                        const newProvider = providerFromUrl(
                          settings.currentProvider.apiUrl,
                          settings.currentProvider.name
                        );

                        // Get array with provider removed
                        const updatedProviders = { ...settings.providers };
                        if (updatedProviders[settings.currentProvider.name]) {
                          delete updatedProviders[settings.currentProvider.name];
                        }

                        setSettings({
                          ...settings,
                          providers: updatedProviders,
                          currentProvider: newProvider,
                        });
                      }}
                      isDisabled={!settings.currentProvider.apiKey}
                    >
                      Remove
                    </Button>
                  </ButtonGroup>
                </FormLabel>
                <RevealablePasswordInput
                  type="password"
                  value={settings.currentProvider.apiKey || ""}
                  onChange={(e) => {
                    const newProvider = providerFromUrl(
                      settings.currentProvider.apiUrl,
                      settings.currentProvider.name,
                      e.target.value
                    );

                    setSettings({
                      ...settings,
                      currentProvider: newProvider,
                      providers: {
                        ...settings.providers,
                        [newProvider.name]: newProvider,
                      },
                    });
                  }}
                />
                {settings.currentProvider instanceof OpenRouterProvider &&
                  !settings.currentProvider.apiKey && (
                    <Button
                      mt="3"
                      size="sm"
                      onClick={settings.currentProvider.openRouterPkceRedirect}
                    >
                      Get API key from OpenRouter{" "}
                    </Button>
                  )}

                <FormErrorMessage>
                  Unable to verify API Key with {settings.currentProvider.name}.
                </FormErrorMessage>
                <FormHelperText>Your API Key is stored in browser storage</FormHelperText>
              </FormControl> */}

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
                <FormLabel>Select Voice</FormLabel>

                <Flex gap={3} alignItems={"center"}>
                  <Select
                    value={settings.textToSpeech.voice}
                    onChange={(evt) => handleVoiceSelection(evt.target.value as TextToSpeechVoices)}
                  >
                    {Object.values(TextToSpeechVoices).map((voice) => (
                      <option key={voice} value={voice}>
                        {capitalize(voice)}
                      </option>
                    ))}
                  </Select>
                  <Tooltip label="Audio Preview">
                    <IconButton
                      variant="outline"
                      type="button"
                      aria-label={"Audio Preview for " + capitalize(settings.textToSpeech.voice)}
                      icon={<MdVolumeUp />}
                      onClick={handlePlayAudioPreview}
                    />
                  </Tooltip>
                </Flex>

                <FormHelperText>
                  Used when announcing messages in real-time or with the &lsquo;Speak&rsquo; option
                </FormHelperText>
              </FormControl>

              <FormControl as="fieldset">
                <FormLabel as="legend">Image Compression</FormLabel>
                <Stack>
                  <Box px="5">
                    <FormControl>
                      <FormLabel>
                        Maximum file size after compression: {settings.maxCompressedFileSizeMB} (MB)
                      </FormLabel>
                      <Slider
                        id="max-compressed-file-size"
                        value={settings.maxCompressedFileSizeMB}
                        onChange={(value) =>
                          setSettings({ ...settings, maxCompressedFileSizeMB: value })
                        }
                        min={1}
                        max={20}
                        step={1}
                      >
                        <SliderTrack>
                          <SliderFilledTrack />
                        </SliderTrack>
                        <SliderThumb />
                      </Slider>
                      <FormErrorMessage>
                        Maximum file size must be between 1 and 20 MB.
                      </FormErrorMessage>
                      <FormHelperText>
                        After compression, each attached image will be under your chosen maximum
                        file size (1-20 MB).
                      </FormHelperText>
                    </FormControl>
                  </Box>
                  <Box px="5">
                    <FormControl>
                      <FormLabel>
                        Maximum image dimension: {settings.maxImageDimension} (px)
                      </FormLabel>
                      <Slider
                        id="max-image-dimension"
                        value={settings.maxImageDimension}
                        onChange={(value) => setSettings({ ...settings, maxImageDimension: value })}
                        min={16}
                        max={2048}
                        step={16}
                      >
                        <SliderTrack>
                          <SliderFilledTrack />
                        </SliderTrack>
                        <SliderThumb />
                      </Slider>
                      <FormErrorMessage>
                        Maximum Image dimension must be between 16 and 2048
                      </FormErrorMessage>
                      <FormHelperText>
                        Your compressed image&apos;s maximum width or height will be within the
                        dimension you choose (16-2048 pixels).
                      </FormHelperText>
                    </FormControl>
                  </Box>
                  <Box px="5">
                    <FormControl>
                      <FormLabel>Compression factor: {settings.compressionFactor}</FormLabel>
                      <Slider
                        id="compression-factor"
                        value={settings.compressionFactor}
                        onChange={(value) => setSettings({ ...settings, compressionFactor: value })}
                        min={0.1}
                        max={1}
                        step={0.1}
                      >
                        <SliderTrack>
                          <SliderFilledTrack />
                        </SliderTrack>
                        <SliderThumb />
                      </Slider>
                      <FormErrorMessage>
                        Compression factor must be between 0.1 and 1.0
                      </FormErrorMessage>
                      <FormHelperText>
                        Set the maximum file size based on the original size multiplied by the
                        factor you choose (0.1-1.0).
                      </FormHelperText>
                    </FormControl>
                  </Box>
                </Stack>
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
