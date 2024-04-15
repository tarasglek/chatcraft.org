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
  InputGroup,
  Link,
  ModalBody,
  Select,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  VStack,
} from "@chakra-ui/react";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDebounce } from "react-use";

import { capitalize } from "lodash-es";
import { FaCheck } from "react-icons/fa";
import { MdCancel, MdVolumeUp } from "react-icons/md";
import { useAlert } from "../../hooks/use-alert";
import useAudioPlayer from "../../hooks/use-audio-player";
import { useModels } from "../../hooks/use-models";
import { useSettings } from "../../hooks/use-settings";
import { ChatCraftModel } from "../../lib/ChatCraftModel";
import { ChatCraftProvider, ProviderData } from "../../lib/ChatCraftProvider";
import { textToSpeech } from "../../lib/ai";
import db from "../../lib/db";
import { providerFromUrl, supportedProviders } from "../../lib/providers";
import { CustomProvider } from "../../lib/providers/CustomProvider";
import { FreeModelProvider } from "../../lib/providers/DefaultProvider/FreeModelProvider";
import { OpenAiProvider } from "../../lib/providers/OpenAiProvider";
import { OpenRouterProvider } from "../../lib/providers/OpenRouterProvider";
import { TextToSpeechVoices } from "../../lib/settings";
import { download } from "../../lib/utils";
import PasswordInput from "../PasswordInput";

interface ModelsSettingsProps {
  isOpen: boolean;
}

// https://dexie.org/docs/StorageManager
async function isStoragePersisted() {
  if (navigator.storage?.persisted) {
    return await navigator.storage.persisted();
  }

  return false;
}

function ModelsSettings(isOpen: ModelsSettingsProps) {
  const { settings, setSettings } = useSettings();
  const { models } = useModels();

  // Whether our db is being persisted
  const [isPersisted, setIsPersisted] = useState(false);
  const { info, error, success, warning } = useAlert();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isApiKeyInvalid, setIsApiKeyInvalid] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ChatCraftProvider | null>(null);
  const [newCustomProvider, setNewCustomProvider] = useState<ChatCraftProvider | null>(null);
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Stores the list of providers we are displaying in providers table
  const [tableProviders, setTableProviders] = useState<ProviderData>({});

  // Stores the provider that has its api key field currently actively selected
  const [focusedProvider, setFocusedProvider] = useState<ChatCraftProvider | null>(
    settings.currentProvider
  );

  // Get the list of providers to display in providers table
  // Combination of default list of supported providers and settings.providers from localStorage
  useEffect(() => {
    setTableProviders({ ...supportedProviders, ...settings.providers });
  }, [settings.providers]);

  // Check the API Key, but debounce requests if user is typing
  useDebounce(
    () => {
      setIsApiKeyInvalid(false);
      if (focusedProvider) {
        setIsValidating(true);
        if (!focusedProvider.apiKey) {
          setIsApiKeyInvalid(true);
          setIsValidating(false);
        } else {
          focusedProvider
            .validateApiKey(focusedProvider.apiKey)
            .then((result: boolean) => {
              setIsApiKeyInvalid(!result);
            })
            .catch((err: any) => {
              console.warn("Error validating API key", err.message);
              setIsApiKeyInvalid(true);
            })
            .finally(() => setIsValidating(false));
        }
      }
    },
    500,
    [focusedProvider]
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

  const handleApiKeyChange = (provider: ChatCraftProvider, apiKey: string) => {
    const newProvider = providerFromUrl(
      provider.apiUrl,
      apiKey,
      provider.name,
      provider.defaultModel
    );

    // Set as focused provider to trigger key validation
    setFocusedProvider(newProvider);

    if (newProvider.name === settings.currentProvider.name) {
      // Save key to settings.currentProvider and settings.providers
      setSettings({
        ...settings,
        currentProvider: newProvider,
        providers: {
          ...settings.providers,
          [newProvider.name]: newProvider,
        },
      });
    } else {
      // Save key to settings.providers
      setSettings({
        ...settings,
        providers: {
          ...settings.providers,
          [newProvider.name]: newProvider,
        },
      });
    }

    // If the key that was changed is the selected provider, update the selected provider
    if (newProvider.name === selectedProvider?.name) {
      setSelectedProvider(newProvider);
    }

    setApiKeySaved(true);
  };

  const handleSetCurrentProvider = async () => {
    if (!selectedProvider) {
      console.error("Error trying to set current provider, missing selected provider");
      setFocusedProvider(null);
      return;
    }

    if (selectedProvider.name === settings.currentProvider.name) {
      setFocusedProvider(null);
      warning({
        title: "No change needed",
        message: "This is already your current provider",
      });
      return;
    }

    setFocusedProvider(selectedProvider);

    // Validate api key
    setIsApiKeyInvalid(false);
    setIsValidating(true);
    if (!selectedProvider.apiKey) {
      setIsApiKeyInvalid(true);
      setIsValidating(false);
    } else {
      selectedProvider
        .validateApiKey(selectedProvider.apiKey)
        .then((result: boolean) => {
          setIsApiKeyInvalid(!result);

          // Set as current provider
          setSettings({ ...settings, currentProvider: selectedProvider });
          setApiKeySaved(true);
          setSelectedProvider(null);

          success({
            title: "Current provider changed",
            message: `${selectedProvider.name} set as current provider`,
          });

          // Uncheck checkbox
          setSelectedProvider(null);
        })
        .catch((err: any) => {
          console.warn("Error validating API key", err);
          setIsApiKeyInvalid(true);

          warning({
            title: "Provider not set",
            message: err.message,
          });
        })
        .finally(() => setIsValidating(false));
    }
  };

  // Handle checkbox change
  const handleSelectedProviderChange = (provider: ChatCraftProvider) => {
    if (selectedProvider?.name === provider.name) {
      // Selecting same one means deselect
      setSelectedProvider(null);
    } else {
      setSelectedProvider(provider);
    }
  };

  const handleAddProvider = () => {
    setIsApiKeyInvalid(false);
    setNewCustomProvider(new CustomProvider("", "", "", ""));
  };

  const handleDeleteCustomProvider = () => {
    setFocusedProvider(null);

    if (!selectedProvider) {
      console.error("Error trying to delete provider, missing selected provider");
      return;
    }

    // Do not allow default provider to be deleted
    if (selectedProvider.name === settings.currentProvider.name) {
      warning({
        title: "Action not allowed",
        message: "You may not delete the current provider.",
      });
      return;
    }

    // Do not allow ChatCraft initial providers to be deleted
    if (supportedProviders[selectedProvider.name]) {
      warning({
        title: "Action not allowed",
        message: "You may not delete default ChatCraft providers.",
      });
      return;
    }

    const newSettingsProviders = { ...settings.providers };
    delete newSettingsProviders[selectedProvider.name];
    setSettings({ ...settings, providers: newSettingsProviders });

    // Uncheck checkbox
    setSelectedProvider(null);
  };

  const handleSaveNewCustomProvider = async () => {
    setFocusedProvider(newCustomProvider);

    if (!newCustomProvider) {
      console.error("Error trying to save new custom provider, missing custom provider");
      return;
    }

    const trimmedData = new CustomProvider(
      newCustomProvider.name?.trim(),
      newCustomProvider.apiUrl?.trim(),
      "",
      newCustomProvider.apiKey?.trim()
    );

    if (!trimmedData.name || !trimmedData.apiUrl || !trimmedData.apiKey) {
      setNewCustomProvider(trimmedData);
      return;
    }

    // Check if provider name already exists
    if (tableProviders[trimmedData.name]) {
      warning({
        title: "Provider not added",
        message: "A provider with this name already exists.",
      });
      return;
    }

    // Create new ChatCraftProvider object from CustomProviderProvider parsing provider type from url
    const newProvider = providerFromUrl(trimmedData.apiUrl, trimmedData.apiKey, trimmedData.name);

    if (newProvider instanceof FreeModelProvider) {
      warning({
        title: "Provider not added",
        message: "Free AI Models provider already exists",
      });
      return;
    }

    // Validate api key
    try {
      setIsApiKeyInvalid(false);
      setIsValidating(true);
      const result = await newProvider.validateApiKey(newProvider.apiKey!);
      setIsApiKeyInvalid(!result);
      if (!result) {
        return;
      }

      // Query list of models
      let models = [];
      try {
        models = await newProvider.queryModels(newProvider.apiKey!);
      } catch (err: any) {
        console.warn("Error querying models for custom provider:", err);
        setFocusedProvider(null);
        warning({
          title: "Provider not added",
          message: err.message,
        });
        return;
      }

      if (models.length === 0) {
        console.warn("No models available for custom provider");
        setFocusedProvider(null);
        warning({
          title: "Provider not added",
          message: "Provider is not Open AI compatible.",
        });
        return;
      }

      // Set the first model in list as defaultModel
      const newProviderWithModel = providerFromUrl(
        newCustomProvider.apiUrl,
        newCustomProvider.apiKey,
        newCustomProvider.name,
        models[0]
      );

      // Save the new custom provider
      setSettings({
        ...settings,
        providers: {
          ...settings.providers,
          [newProviderWithModel.name]: newProviderWithModel,
        },
      });
      setApiKeySaved(true);

      success({
        title: `New provider added`,
        message: `${newProviderWithModel.name}`,
      });

      // Clear the form and hide the new provider row
      setNewCustomProvider(null);
      setIsValidating(false);
    } catch (err: any) {
      console.warn("Error validating API key", err.message);
      setFocusedProvider(null);
      warning({
        title: "Provider not added",
        message: err.message,
      });
      setIsValidating(false);
      return;
    }
  };

  const extractDomain = (url: string | URL): string => {
    try {
      // ensure the input is always treated as a string
      const urlString = url instanceof URL ? url.href : url;
      const parsedUrl = new URL(urlString);
      return parsedUrl.hostname;
    } catch (err: any) {
      console.error("Error extracting domain from URL:", err);
      return typeof url === "string" ? url : "Invalid URL";
    }
  };

  // Clean up actions when modal closes
  useEffect(() => {
    if (!isOpen) {
      setNewCustomProvider(null);
      setIsApiKeyInvalid(false);
    }
  }, [isOpen]);

  const isTtsSupported = useMemo(() => {
    return !!models.filter((model) => model.id.includes("tts"))?.length;
  }, [models]);

  return (
    <ModalBody>
      {!tableProviders ? (
        <Box>Loading providers...</Box>
      ) : (
        <VStack gap={6} mt={3}>
          <FormControl>
            <FormLabel>
              Providers
              <ButtonGroup ml={3}>
                <Button size="xs" onClick={handleAddProvider}>
                  Add
                </Button>
                <Button
                  size="xs"
                  colorScheme="red"
                  onClick={handleDeleteCustomProvider}
                  isDisabled={!selectedProvider}
                >
                  Delete
                </Button>
                <Button
                  size="xs"
                  colorScheme="blue"
                  onClick={handleSetCurrentProvider}
                  isDisabled={!selectedProvider}
                  variant="outline"
                >
                  Set as Current Provider
                </Button>
              </ButtonGroup>
              <FormHelperText fontSize="xs">
                Advanced option for use with other OpenAI-compatible APIs
              </FormHelperText>
            </FormLabel>
            <Table
              size="sm"
              variant="simple"
              sx={{
                "th:nth-of-type(2), td:nth-of-type(2), th:nth-of-type(3), td:nth-of-type(3)": {
                  width: "30%",
                },
                "th, td": {
                  pl: "0.4rem",
                  pr: "0.4rem",
                },
                "th:nth-of-type(1), td:nth-of-type(1)": {
                  width: "5%",
                },
                "th:nth-of-type(4), td:nth-of-type()": {
                  width: "12%",
                },
                "th:last-child, td:last-child": {
                  width: "11%",
                },
              }}
            >
              <Thead>
                <Tr>
                  <Th></Th>
                  <Th>Name</Th>
                  <Th>API URL</Th>
                  <Th>API Key</Th>
                  <Th sx={{ textAlign: "center" }}>In Use</Th>
                </Tr>
              </Thead>
              <Tbody>
                {newCustomProvider && (
                  <Tr>
                    <Td>
                      <IconButton
                        aria-label="Cancel adding new provider"
                        icon={<MdCancel />}
                        size={"xs"}
                        onClick={() => setNewCustomProvider(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            setNewCustomProvider(null);
                          }
                        }}
                        variant="outline"
                        tabIndex={0}
                        color={"grey"}
                        border={"none"}
                        p={0}
                        fontSize={16}
                        borderRadius={"50%"}
                        _hover={{
                          borderColor: "gray.400",
                          color: "gray.400",
                        }}
                        _focus={{
                          _focus: {
                            outline: "none",
                            boxShadow: "0 0 0 3px rgba(66, 153, 225, 0.6)",
                            borderColor: "blue.300",
                          },
                        }}
                        _active={{
                          backgroundColor: "none",
                        }}
                      />
                    </Td>
                    <Td>
                      <FormControl isInvalid={!newCustomProvider.name}>
                        <InputGroup size="sm">
                          <Input
                            pl="0.4rem"
                            fontSize="xs"
                            placeholder="Name"
                            value={newCustomProvider.name}
                            onChange={(e) => {
                              setNewCustomProvider(
                                new CustomProvider(
                                  e.target.value,
                                  newCustomProvider.apiUrl,
                                  "",
                                  newCustomProvider.apiKey
                                )
                              );
                            }}
                          />
                        </InputGroup>
                        <FormErrorMessage fontSize="xs">Name is required.</FormErrorMessage>
                      </FormControl>
                    </Td>
                    <Td>
                      <FormControl isInvalid={!newCustomProvider.apiUrl}>
                        <InputGroup size="sm">
                          <Input
                            pl="0.4rem"
                            fontSize="xs"
                            placeholder="API URL"
                            value={newCustomProvider.apiUrl}
                            onChange={(e) => {
                              setNewCustomProvider(
                                new CustomProvider(
                                  newCustomProvider.name,
                                  e.target.value,
                                  "",
                                  newCustomProvider.apiKey
                                )
                              );
                            }}
                          />
                        </InputGroup>
                        <FormErrorMessage fontSize="xs">API URL is required.</FormErrorMessage>
                      </FormControl>
                    </Td>
                    <Td>
                      <FormControl isInvalid={!newCustomProvider.apiKey}>
                        <PasswordInput
                          size="sm"
                          buttonSize="xs"
                          paddingRight={"2.5rem"}
                          paddingLeft={"0.5rem"}
                          fontSize="xs"
                          placeholder="API Key"
                          value={newCustomProvider.apiKey || ""}
                          onChange={(e) => {
                            setNewCustomProvider(
                              new CustomProvider(
                                newCustomProvider.name,
                                newCustomProvider.apiUrl,
                                "",
                                e.target.value
                              )
                            );
                          }}
                        />
                        <FormErrorMessage fontSize="xs">API Key is required.</FormErrorMessage>
                      </FormControl>
                    </Td>
                    <Td sx={{ textAlign: "center" }}>
                      <Flex alignItems="center" justifyContent="center">
                        <Button
                          size="xs"
                          colorScheme="blue"
                          onClick={handleSaveNewCustomProvider}
                          isLoading={
                            focusedProvider?.name === newCustomProvider.name && isValidating
                          }
                        >
                          Save
                        </Button>
                      </Flex>
                    </Td>
                  </Tr>
                )}
                {[...Object.values(tableProviders)] // copy of the array
                  .reverse() // reverse the array so new provider is at top
                  .map((provider) => {
                    return (
                      <Tr key={provider.name}>
                        <Td>
                          <Flex width={6} justifyContent={"center"}>
                            <Checkbox
                              onChange={() => handleSelectedProviderChange(provider)}
                              isChecked={selectedProvider?.name === provider.name}
                            />
                          </Flex>
                        </Td>
                        <Td fontSize="xs">{provider.name}</Td>
                        <Td fontSize="xs">
                          <Tooltip
                            label={provider.apiUrl}
                            placement="top-start"
                            sx={{ fontSize: "0.65rem" }}
                          >
                            <Text cursor="pointer">{extractDomain(provider.apiUrl)}</Text>
                          </Tooltip>
                        </Td>
                        <Td>
                          {provider.name === "Free AI Models" ? (
                            <InputGroup size="sm">
                              <Input disabled fontSize="xs" value="N/A" />
                            </InputGroup>
                          ) : (
                            <FormControl
                              isInvalid={
                                !!(
                                  !isValidating &&
                                  focusedProvider?.name === provider.name &&
                                  isApiKeyInvalid
                                )
                              }
                            >
                              <PasswordInput
                                size="sm"
                                buttonSize="xs"
                                paddingRight={"2.5rem"}
                                paddingLeft={"0.5rem"}
                                fontSize="xs"
                                value={provider.apiKey || ""}
                                onChange={(e) => handleApiKeyChange(provider, e.target.value)}
                                onFocus={() => setFocusedProvider(provider)}
                                isDisabled={provider instanceof FreeModelProvider}
                                isInvalid={
                                  !!(
                                    !isValidating &&
                                    focusedProvider?.name === provider.name &&
                                    isApiKeyInvalid
                                  )
                                }
                              />
                              {focusedProvider?.name === provider.name && isValidating ? (
                                <Flex mt={2}>
                                  <Spinner size="xs" />
                                  <Text ml={2} fontSize="xs">
                                    Validating...
                                  </Text>{" "}
                                </Flex>
                              ) : (
                                <FormErrorMessage fontSize="xs">
                                  {focusedProvider?.apiKey
                                    ? "Unable to verify key."
                                    : "API Key is required."}
                                </FormErrorMessage>
                              )}
                              {provider instanceof OpenRouterProvider &&
                                provider.name === focusedProvider?.name &&
                                !provider.apiKey && (
                                  <Button
                                    mt="3"
                                    size="xs"
                                    onClick={provider.openRouterPkceRedirect}
                                  >
                                    Get OpenRouter key{" "}
                                  </Button>
                                )}
                            </FormControl>
                          )}
                        </Td>
                        <Td sx={{ textAlign: "center" }}>
                          <Flex alignItems="center" justifyContent="center">
                            {settings.currentProvider.name === provider.name && (
                              <FaCheck style={{ color: "green" }} />
                            )}
                          </Flex>
                        </Td>
                      </Tr>
                    );
                  })}
              </Tbody>
            </Table>
            {apiKeySaved && (
              <FormHelperText fontSize="xs">
                Your API Key(s) are stored in browser storage
              </FormHelperText>
            )}
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

          {isTtsSupported && (
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
          )}
        </VStack>
      )}
    </ModalBody>
  );
}

export default ModelsSettings;
