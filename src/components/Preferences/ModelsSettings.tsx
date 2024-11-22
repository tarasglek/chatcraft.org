import {
  Box,
  Group as ButtonGroup,
  Flex,
  HStack,
  IconButton,
  Input,
  Link,
  Spinner,
  Stack,
  Table,
  Tooltip,
  VStack,
  Badge,
  Text,
  createListCollection,
} from "@chakra-ui/react";
import {
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from "../ui/select";
import { Slider } from "../ui/slider";
import { Field } from "../ui/field";
import { Button } from "../ui/button";
import { PasswordInput, PasswordStrengthMeter } from "../ui/password-input";
import { Checkbox } from "../ui/checkbox";
import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { InputGroup } from "../ui/input-group";

import { capitalize } from "lodash-es";
import { FaCheck } from "react-icons/fa";
import { MdCancel, MdVolumeUp } from "react-icons/md";
import { useAlert } from "../../hooks/use-alert";
import useAudioPlayer from "../../hooks/use-audio-player";
import { useModels } from "../../hooks/use-models";
import { useSettings } from "../../hooks/use-settings";
import { ChatCraftModel } from "../../lib/ChatCraftModel";
import { ChatCraftProvider, ProviderData } from "../../lib/ChatCraftProvider";
import db from "../../lib/db";
import { providerFromUrl, supportedProviders } from "../../lib/providers";
import { CustomProvider } from "../../lib/providers/CustomProvider";
import { FreeModelProvider } from "../../lib/providers/DefaultProvider/FreeModelProvider";
import { OpenAiProvider } from "../../lib/providers/OpenAiProvider";
import { OpenRouterProvider } from "../../lib/providers/OpenRouterProvider";
import { TextToSpeechVoices } from "../../lib/settings";
import { download } from "../../lib/utils";
//import PasswordInput from "../PasswordInput";
import { useTextToSpeech } from "../../hooks/use-text-to-speech";

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

interface ModelsSettingsProps {
  isOpen: boolean;
  modelRef: React.RefObject<HTMLDivElement>;
}

function ModelsSettings({ isOpen, modelRef }: ModelsSettingsProps) {
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

  console.log(models);
  // Create List of collection to use in Chakra 3.0 select
  const modelFrameWork = createListCollection({
    items: Array.isArray(models) ? models : [],
  });

  //const modelsList = createListCollection(models as any);

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
  const { isTextToSpeechSupported, textToSpeech } = useTextToSpeech();

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
  }, [addToAudioQueue, clearAudioQueue, error, settings.textToSpeech, textToSpeech]);

  const handleApiKeyChange = async (provider: ChatCraftProvider, apiKey: string) => {
    if (!provider) {
      console.error("Error trying to change api key, missing provider");
      return;
    }
    provider.apiKey = apiKey;

    //console.log("New provider", provider);

    setFocusedProvider(provider);

    const newProviders = { ...settings.providers };

    // Update api key in table
    tableProviders[provider.name] = provider;

    // Api key validation
    try {
      setIsApiKeyInvalid(false);
      setIsValidating(true);

      const result = await provider.validateApiKey(provider.apiKey);

      setIsApiKeyInvalid(!result);
      setIsValidating(false);
      if (result) {
        // Valid key, update in settings.providers
        newProviders[provider.name] = provider;
      } else {
        // Invalid key, remove from settings.providers
        delete newProviders[provider.name];
      }
    } catch {
      setIsApiKeyInvalid(true);
      setIsValidating(false);

      // Invalid key, remove from settings.providers
      delete newProviders[provider.name];
    }

    setSettings({
      ...settings,
      ...(provider.name === settings.currentProvider.name && { currentProvider: provider }),
      providers: newProviders,
    });

    if (provider.name === selectedProvider?.name) {
      setSelectedProvider(provider);
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

    // Api key validation
    try {
      setIsApiKeyInvalid(false);
      setIsValidating(true);

      const result = await selectedProvider.validateApiKey(selectedProvider.apiKey!);

      setIsApiKeyInvalid(!result);
      setIsValidating(false);

      // Valid key
      if (result) {
        // Set as current provider
        setSettings({ ...settings, currentProvider: selectedProvider });
        setApiKeySaved(true);
        setSelectedProvider(null);

        success({
          title: "Current provider changed",
          message: `${selectedProvider.name} set as current provider`,
        });

        setSettings({ ...settings, currentProvider: selectedProvider });
        setApiKeySaved(true);

        // Sync table
        tableProviders[selectedProvider.name] = selectedProvider;

        // Uncheck checkbox
        setSelectedProvider(null);
      } else {
        console.warn("Error validating API key");
        error({
          title: "Provider not set",
          message: "Invalid API key",
        });
      }
    } catch (err: any) {
      setIsValidating(false);

      console.warn("Error validating API key", err);
      setIsApiKeyInvalid(true);

      error({
        title: "Provider not set",
        message: err.message,
      });
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

    const newProviders = { ...settings.providers };
    delete newProviders[selectedProvider.name];
    setSettings({ ...settings, providers: newProviders });

    // Uncheck checkbox
    setSelectedProvider(null);

    // Sync table
    setTableProviders({ ...supportedProviders, ...newProviders });
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

    // Api key validation
    try {
      setIsApiKeyInvalid(false);
      setIsValidating(true);

      const result = await newProvider.validateApiKey(newProvider.apiKey!);

      setIsApiKeyInvalid(!result);
      setIsValidating(false);

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
        error({
          title: "Provider not added",
          message: err.message,
        });
        return;
      }

      if (models.length === 0) {
        console.warn("No models available for custom provider");
        setFocusedProvider(null);
        error({
          title: "Provider not added",
          message: "Provider is not OpenAI compatible.",
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

      const newProviders = { ...settings.providers };
      newProviders[newProviderWithModel.name] = newProviderWithModel;

      setSettings({
        ...settings,
        providers: newProviders,
      });
      setApiKeySaved(true);

      // Sync table
      setTableProviders({ ...supportedProviders, ...newProviders });

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
      error({
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
    // Sync table
    setTableProviders({ ...supportedProviders, ...settings.providers });

    if (!isOpen) {
      setNewCustomProvider(null);
      setIsApiKeyInvalid(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <Box my={3}>
      {!tableProviders ? (
        <Box>Loading providers...</Box>
      ) : (
        <VStack gap={4} width={"full"}>
          <Stack w="full" gap="2">
            <Field
              orientation={"vertical"}
              direction={"column"}
              display={"flex"}
              helperText="Advanced option for use with other OpenAI-compatible APIs"
            >
              <VStack>
                <ButtonGroup>
                  <Text textStyle={"lg"}>Providers</Text>
                  <Button
                    size="xs"
                    px={4}
                    h={6}
                    borderRadius={8}
                    colorPalette={"blue"}
                    onClick={handleAddProvider}
                  >
                    Add
                  </Button>
                  <Button
                    size="xs"
                    px={4}
                    h={6}
                    colorPalette={"red"}
                    onClick={handleDeleteCustomProvider}
                    disabled={!selectedProvider}
                  >
                    Delete
                  </Button>
                  <Button
                    size="xs"
                    colorPalette={"cyan"}
                    onClick={handleSetCurrentProvider}
                    disabled={!selectedProvider}
                    variant="outline"
                  >
                    Set as Current Provider
                  </Button>
                </ButtonGroup>
              </VStack>
            </Field>
            <Box width={"100%"} mx="auto">
              <Field helperText="Your API Key(s) are stored in browser storage">
                <Table.Root size={"sm"} width="100%">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader></Table.ColumnHeader>
                      <Table.ColumnHeader>Name</Table.ColumnHeader>
                      <Table.ColumnHeader>API URL</Table.ColumnHeader>
                      <Table.ColumnHeader>API KEY</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign={"center"}>In Use</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {newCustomProvider && (
                      <Table.Row>
                        <Table.Cell>
                          <IconButton
                            aria-label="Cancel adding new provider"
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
                          >
                            <MdCancel />
                          </IconButton>
                        </Table.Cell>
                        <Table.Cell>
                          <Field invalid={!newCustomProvider.name} errorText="Name is required.">
                            <InputGroup>
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
                          </Field>
                        </Table.Cell>
                        <Table.Cell>
                          <Field
                            invalid={!newCustomProvider.apiUrl}
                            errorText="API URL is required."
                          >
                            <InputGroup>
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
                          </Field>
                        </Table.Cell>
                        <Table.Cell>
                          <Field
                            invalid={!newCustomProvider.apiKey}
                            errorText="API Key is required."
                          >
                            <PasswordInput
                              size="xs"
                              paddingRight={"2rem"}
                              paddingLeft={"0.5rem"}
                              fontSize="xs"
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
                          </Field>
                        </Table.Cell>
                        <Table.Cell>
                          <Button
                            size="xs"
                            disabled={
                              !newCustomProvider.name ||
                              !newCustomProvider.apiUrl ||
                              !newCustomProvider.apiKey
                            }
                            colorScheme="blue"
                            onClick={handleSaveNewCustomProvider}
                            loading={
                              focusedProvider?.name === newCustomProvider.name && isValidating
                            }
                          >
                            Save
                          </Button>
                        </Table.Cell>
                      </Table.Row>
                    )}
                    {Object.entries(tableProviders && tableProviders)
                      .reverse()
                      .map(([name, provider]) => (
                        <Table.Row key={name}>
                          <Table.Cell>
                            <Flex width={6} justifyContent={"center"}>
                              <Checkbox
                                variant={"subtle"}
                                onCheckedChange={() => handleSelectedProviderChange(provider)}
                                checked={selectedProvider?.name === provider.name}
                              />
                            </Flex>
                          </Table.Cell>
                          <Table.Cell>{provider.name}</Table.Cell>
                          <Table.Cell>{provider.apiUrl}</Table.Cell>
                          <Table.Cell>
                            <Field
                              invalid={
                                !!(
                                  !isValidating &&
                                  focusedProvider?.name === provider.name &&
                                  isApiKeyInvalid
                                )
                              }
                              errorText={` ${provider.apiKey ? "Unable to verify key." : "API Key is required."}`}
                            >
                              <PasswordInput
                                size="xs"
                                borderRadius={10}
                                fontSize="xs"
                                value={provider.apiKey || ""}
                                // Bug will fix after migrate done
                                // ideally input should accept input by key wise
                                onChange={(e) => handleApiKeyChange(provider, e.target.value)}
                                onFocus={() => setFocusedProvider(provider)}
                                disabled={provider instanceof FreeModelProvider}
                              />
                              {focusedProvider?.name === provider.name && isValidating && (
                                <Flex mt={2}>
                                  <Spinner size="xs" />
                                  <Text ml={2} fontSize="xs">
                                    Validating...
                                  </Text>{" "}
                                </Flex>
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
                            </Field>
                          </Table.Cell>

                          <Table.Cell justifyItems={"center"} justifyContent={"center"} mx={"auto"}>
                            {settings.currentProvider.name === provider.name && (
                              <FaCheck style={{ color: "green" }} />
                            )}
                          </Table.Cell>
                        </Table.Row>
                      ))}
                  </Table.Body>
                </Table.Root>
              </Field>
              <Field
                mt={4}
                orientation={"vertical"}
                helperText={`Persisted databases use the Storage API and are retained by the browser as long as possible. See documents for database export details.`}
              >
                <ButtonGroup mt={0}>
                  <Text textStyle={"sm"} fontWeight={"medium"}>
                    Offline database is {isPersisted ? "persisted" : "not persisted"}
                  </Text>
                  <Button
                    size="xs"
                    h={6}
                    colorPalette={isPersisted ? "green" : "blue"}
                    borderRadius={10}
                    onClick={() => handlePersistClick()}
                    disabled={isPersisted}
                    variant="outline"
                  >
                    Persist
                  </Button>
                  <Button
                    size="xs"
                    variant={"outline"}
                    h={6}
                    borderRadius={10}
                    onClick={() => handleImportClick()}
                  >
                    Import
                  </Button>
                  <Input
                    type="file"
                    ref={inputRef}
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />
                  <Button
                    size="xs"
                    h={6}
                    variant={"outline"}
                    borderRadius={10}
                    onClick={() => handleExportClick()}
                  >
                    Export
                  </Button>
                </ButtonGroup>
              </Field>
              <Box spaceX={4}>
                <Badge>
                  <Link
                    href="https://developer.mozilla.org/en-US/docs/Web/API/Storage_API"
                    textDecoration="underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Storage API
                  </Link>{" "}
                </Badge>
                <Badge>
                  <Link
                    href="https://dexie.org/docs/ExportImport/dexie-export-import"
                    textDecoration="underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Documents
                  </Link>
                </Badge>
              </Box>
              <Field
                label="GPT Model"
                mt={4}
                helperText="See documents and pricing. NOTE: not all accounts have access to GPT - 4"
              >
                <SelectRoot collection={modelFrameWork} size="sm">
                  <SelectTrigger>
                    <SelectValueText placeholder="Model" />
                  </SelectTrigger>
                  <SelectContent portalRef={modelRef} width={"full"}>
                    <Box>
                      {modelFrameWork.items
                        .filter(
                          (model) =>
                            !(settings.currentProvider instanceof OpenAiProvider) ||
                            model.id.includes("gpt")
                        )
                        .map((m) => (
                          <SelectItem
                            item={m.id}
                            key={m.id}
                            zIndex={10}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                model: new ChatCraftModel((e.target as HTMLSelectElement).value),
                              })
                            }
                          >
                            <HStack>
                              {m.logoUrl && (
                                <img src={m.logoUrl} alt={m.name} width={20} height={20} />
                              )}
                              {m.prettyModel}
                            </HStack>
                          </SelectItem>
                        ))}
                    </Box>
                  </SelectContent>
                </SelectRoot>
              </Field>
              <Field
                mt={4}
                helperText="Used when announcing messages in real-time or with the &lsquo;Speak&rsquo; option"
              >
                <Slider
                  label={`Temperature: ${settings.temperature === 0 ? "unset temperature" : settings.temperature}`}
                  width="full"
                  size={"sm"}
                  colorPalette={"blue"}
                  defaultValue={[0.4]}
                  onValueChange={({ value }) => {
                    const [temperature] = value;
                    // temperature value = 0.1 - 1.0
                    setSettings({
                      ...settings,
                      temperature,
                    });
                  }}
                  min={0}
                  step={0.05}
                  max={2}
                />
              </Field>
            </Box>
          </Stack>
        </VStack>
      )}
    </Box>
  );
}

export default ModelsSettings;
