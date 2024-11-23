import {
  Box,
  Group as ButtonGroup,
  Input,
  IconButton,
  Container,
  HStack,
  Separator,
  StackSeparator,
} from "@chakra-ui/react";
import {
  MenuContent,
  MenuItem,
  MenuItemGroup,
  MenuRoot,
  MenuSeparator,
  MenuTrigger,
} from "../ui/menu";
import { InputGroup } from "../ui/input-group";
import { Tooltip } from "../ui/tooltip";
import { Button } from "../ui/button";
import { TbChevronUp, TbSearch, TbSend } from "react-icons/tb";
import { FreeModelProvider } from "../../lib/providers/DefaultProvider/FreeModelProvider";
import useMobileBreakpoint from "../../hooks/use-mobile-breakpoint";
import { useSettings } from "../../hooks/use-settings";
import { useModels } from "../../hooks/use-models";
import { MdVolumeOff, MdVolumeUp } from "react-icons/md";
import { IoMdCheckmark } from "react-icons/io";
import { type KeyboardEvent, useRef, useState } from "react";
import useAudioPlayer from "../../hooks/use-audio-player";
import { useDebounce } from "react-use";
import { isChatModel } from "../../lib/ai";
import InterruptSpeechButton from "../InterruptSpeechButton";
import { useTextToSpeech } from "../../hooks/use-text-to-speech";
import { useTheme } from "next-themes";
type PromptSendButtonProps = {
  isLoading: boolean;
};

function MobilePromptSendButton({ isLoading }: PromptSendButtonProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const { settings, setSettings } = useSettings();
  const { models } = useModels();
  const inputRef = useRef<HTMLInputElement>(null);
  const { theme } = useTheme();
  const bgColor = theme === "dark" ? "#90CEF4" : "#2B6CB0";
  const color = theme === "dark" ? "#333" : "#fff";

  const { clearAudioQueue, isAudioQueueEmpty } = useAudioPlayer();
  const { isTextToSpeechSupported } = useTextToSpeech();

  useDebounce(
    () => {
      setDebouncedSearchQuery(searchQuery);
    },
    600,
    [searchQuery]
  );

  const providersList = {
    ...settings.providers,
    "Free AI Models": new FreeModelProvider(),
  };

  return (
    <ButtonGroup attached>
      <HStack gap={0} separator={<StackSeparator />}>
        <Button
          type="submit"
          size="md"
          fontSize="1.375rem"
          width="2.75rem"
          h={7}
          w={10}
          colorPalette={"blue"}
          bg={{
            base: bgColor,
          }}
          borderLeftRadius={"xl"}
          borderRightRadius={"none"}
          aria-label="Submit"
          loading={isLoading}
        >
          <TbSend />
        </Button>
        <MenuRoot>
          <MenuTrigger>
            {isTextToSpeechSupported && isAudioQueueEmpty ? (
              <Tooltip
                content={
                  settings.textToSpeech.announceMessages
                    ? "Text-to-Speech Enabled"
                    : "Text-to-Speech Disabled"
                }
              >
                <IconButton
                  type="button"
                  size="md"
                  variant="solid"
                  aria-label={
                    settings.textToSpeech.announceMessages
                      ? "Text-to-Speech Enabled"
                      : "Text-to-Speech Disabled"
                  }
                  onClick={() => {
                    if (settings.textToSpeech.announceMessages) {
                      // Flush any remaining audio clips being announced
                      clearAudioQueue();
                    }
                    setSettings({
                      ...settings,
                      textToSpeech: {
                        ...settings.textToSpeech,
                        announceMessages: !settings.textToSpeech.announceMessages,
                      },
                    });
                  }}
                >
                  <>
                    {settings.textToSpeech.announceMessages ? (
                      <MdVolumeUp size={25} />
                    ) : (
                      <MdVolumeOff size={25} />
                    )}
                  </>
                </IconButton>
              </Tooltip>
            ) : isTextToSpeechSupported ? (
              <InterruptSpeechButton variant={"dancingBars"} size={"lg"} clearOnly={!isLoading} />
            ) : null}
            <Button
              as={IconButton}
              size="md"
              width="2.75rem"
              fontSize="1.375rem"
              borderRightRadius={"xl"}
              borderLeftRadius={"none"}
              h={7}
              colorPalette={"blue"}
              bg={{
                base: bgColor,
              }}
              variant="solid"
              aria-label="Choose Model"
              title="Choose Model"
            >
              <TbChevronUp />
            </Button>
          </MenuTrigger>
          <MenuContent maxHeight={"85dvh"} maxWidth={"300px"} overflowY={"auto"}>
            <MenuItem value="">
              {Object.entries(providersList).map(([providerName, providerObject]) => (
                <MenuItem paddingInline={4} key={providerName} value="provider-name">
                  <Container
                    onClick={() => {
                      setSettings({ ...settings, currentProvider: providerObject });
                    }}
                  >
                    <HStack>
                      {settings.currentProvider.name === providerName ? (
                        <IoMdCheckmark style={{ marginRight: "0.6rem" }} />
                      ) : (
                        <span style={{ width: "1.6rem", display: "inline-block" }} />
                      )}
                      {providerName}
                    </HStack>
                  </Container>
                </MenuItem>
              ))}
            </MenuItem>
            <MenuSeparator />
            <MenuItem paddingInline={1} pb={2} value="model-id" title="Model">
              <Box maxHeight="40dvh" overflowY="auto">
                {models
                  .filter((model) => isChatModel(model.id))
                  .filter((model) =>
                    model.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
                  )
                  .map((model) => (
                    <MenuItem
                      paddingInline={4}
                      closeOnSelect={true}
                      key={model.id}
                      onClick={() => setSettings({ ...settings, model })}
                      value="model-name"
                    >
                      {settings.model.id === model.id ? (
                        <IoMdCheckmark style={{ marginRight: "0.6rem" }} />
                      ) : (
                        <span
                          style={{
                            paddingLeft: "1.6rem",
                            display: "inline-block",
                          }}
                        />
                      )}
                      {model.name}
                    </MenuItem>
                  ))}
              </Box>
            </MenuItem>
            <MenuSeparator />
            <MenuItem value="search">
              <HStack gap="10" width="full">
                <InputGroup flex="1" startElement={<TbSearch />}>
                  <Input
                    marginInline={2}
                    marginBottom={1}
                    ref={inputRef}
                    type="text"
                    variant="outline"
                    placeholder="Search models..."
                    value={searchQuery}
                    onChange={(e) => {
                      e.preventDefault();
                      setSearchQuery(e.target.value);
                    }}
                  />
                </InputGroup>
              </HStack>
            </MenuItem>
            {isTextToSpeechSupported && (
              <>
                <MenuSeparator />
                <MenuItem asChild value="button">
                  <div>
                    <Button
                      onClick={() => {
                        if (settings.textToSpeech.announceMessages) {
                          // Flush any remaining audio clips being announced
                          clearAudioQueue();
                        }
                        setSettings({
                          ...settings,
                          textToSpeech: {
                            ...settings.textToSpeech,
                            announceMessages: !settings.textToSpeech.announceMessages,
                          },
                        });
                      }}
                    >
                      {settings.textToSpeech.announceMessages ? (
                        <MdVolumeUp style={{ fontSize: "1.25rem" }} />
                      ) : (
                        <MdVolumeOff style={{ fontSize: "1.25rem" }} />
                      )}
                    </Button>
                    {settings.textToSpeech.announceMessages
                      ? "Text-to-Speech Enabled"
                      : "Text-to-Speech Disabled"}
                  </div>
                </MenuItem>
              </>
            )}
          </MenuContent>
        </MenuRoot>
      </HStack>
    </ButtonGroup>
  );
}

function DesktopPromptSendButton({ isLoading }: PromptSendButtonProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const { settings, setSettings } = useSettings();
  const { models } = useModels();
  const inputRef = useRef<HTMLInputElement>(null);
  const { theme } = useTheme();
  const bgColor = theme === "dark" ? "#90CEF4" : "#3182CE";
  const color = theme === "dark" ? "#333" : "#fff";

  useDebounce(
    () => {
      setDebouncedSearchQuery(searchQuery);
    },
    250,
    [searchQuery]
  );

  const onStartTyping = (e: KeyboardEvent<HTMLElement>) => {
    // Check if the inputRef is current and the input is not already focused
    if (inputRef.current && document.activeElement !== inputRef.current) {
      if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Enter") {
        return;
      }
      // Don't handle the keydown event more than once
      e.preventDefault();
      // Ignore control keys
      const char = e.key.length === 1 ? e.key : "";
      // Set the initial character in the input so we don't lose it
      setSearchQuery(searchQuery + char);
      // Make sure we are focused on the input element
      inputRef.current.focus();
    }
  };

  const { clearAudioQueue, isAudioQueueEmpty } = useAudioPlayer();
  const { isTextToSpeechSupported } = useTextToSpeech();

  const providersList = {
    ...settings.providers,
    "Free AI Models": new FreeModelProvider(),
  };

  return (
    <ButtonGroup attached colorPalette={"blue"}>
      <HStack gap={0} separator={<Separator />}>
        <Button
          type="submit"
          size="sm"
          loading={isLoading}
          loadingText="Sending"
          borderRadius={"xl"}
          colorPalette={"blue"}
          h={8}
          bg={{
            base: bgColor,
          }}
          borderRightRadius={"none"}
          color={color}
        >
          <>Ask {settings.model.prettyModel}</>
        </Button>
        {isTextToSpeechSupported && isAudioQueueEmpty ? (
          <Tooltip
            content={
              settings.textToSpeech.announceMessages
                ? "Text-to-Speech Enabled"
                : "Text-to-Speech Disabled"
            }
          >
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (settings.textToSpeech.announceMessages) {
                  // Flush any remaining audio clips being announced
                  clearAudioQueue();
                }
                setSettings({
                  ...settings,
                  textToSpeech: {
                    ...settings.textToSpeech,
                    announceMessages: !settings.textToSpeech.announceMessages,
                  },
                });
              }}
            >
              <>
                {settings.textToSpeech.announceMessages ? (
                  <MdVolumeUp size={18} />
                ) : (
                  <MdVolumeOff size={18} />
                )}
              </>
            </Button>
          </Tooltip>
        ) : isTextToSpeechSupported ? (
          <InterruptSpeechButton variant={"dancingBars"} size={"sm"} clearOnly={!isLoading} />
        ) : null}

        <MenuRoot
          positioning={{
            placement: "top-end",
            strategy: "fixed",
          }}
          closeOnSelect={true}
        >
          <MenuTrigger>
            <Button
              as={IconButton}
              size="sm"
              fontSize="1.25rem"
              aria-label="Choose Model"
              title="Choose Model"
              borderLeftRadius={"none"}
              colorPalette={"blue"}
              h={8}
              bg={{
                base: bgColor,
              }}
              color={color}
            >
              <TbChevronUp />
            </Button>
          </MenuTrigger>
          <MenuContent
            maxHeight={"80vh"}
            overflowY={"auto"}
            zIndex={1}
            onKeyDownCapture={onStartTyping}
          >
            <MenuItemGroup title="Providers">
              {Object.entries(providersList).map(([providerName, providerValue]) => (
                <MenuItem
                  paddingInline={4}
                  key={providerName}
                  onClick={() => {
                    setSettings({ ...settings, currentProvider: providerValue });
                  }}
                  value="provider-name"
                >
                  {settings.currentProvider.name === providerName ? (
                    <IoMdCheckmark style={{ marginRight: "0.6rem" }} />
                  ) : (
                    <span style={{ width: "1.6rem", display: "inline-block" }} />
                  )}
                  {providerName}
                </MenuItem>
              ))}
            </MenuItemGroup>
            <MenuSeparator />
            <MenuItem paddingInline={1} pb={2} value="model-id" title="Model">
              <InputGroup flex="1" startElement={<TbSearch />}>
                <Input
                  marginInline={2}
                  marginBottom={1}
                  ref={inputRef}
                  type="text"
                  variant="outline"
                  placeholder="Search models..."
                  value={searchQuery}
                  onChange={(e) => {
                    e.preventDefault();
                    setSearchQuery(e.target.value);
                  }}
                />
              </InputGroup>
            </MenuItem>

            <MenuItemGroup title="Models">
              <Box maxH={"40vh"}>
                {models
                  .filter((model) => isChatModel(model.id))
                  .filter((model) =>
                    model.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
                  )
                  .map((model) => (
                    <MenuItem
                      key={model.id}
                      value={model.id}
                      _hover={{
                        backgroundColor: "gray.100",
                        cursor: "pointer",
                      }}
                      onClick={() => setSettings({ ...settings, model })}
                    >
                      <HStack>
                        {settings.model.id === model.id ? (
                          <IoMdCheckmark style={{ marginRight: "0.6rem" }} />
                        ) : (
                          <span
                            style={{
                              paddingLeft: "1.6rem",
                              display: "inline-block",
                            }}
                          />
                        )}
                        {model.name}
                      </HStack>
                    </MenuItem>
                  ))}
              </Box>
            </MenuItemGroup>
            <MenuSeparator />
          </MenuContent>
        </MenuRoot>
      </HStack>
    </ButtonGroup>
  );
}

export default function PromptSendButton(props: PromptSendButtonProps) {
  const isMobile = useMobileBreakpoint();
  return isMobile ? <MobilePromptSendButton {...props} /> : <DesktopPromptSendButton {...props} />;
}
