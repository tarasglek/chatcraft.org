import {
  Box,
  Group as ButtonGroup,
  Input,
  IconButton,
  Container,
  HStack,
  Separator,
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

type PromptSendButtonProps = {
  isLoading: boolean;
};

function MobilePromptSendButton({ isLoading }: PromptSendButtonProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const { settings, setSettings } = useSettings();
  const { models } = useModels();
  const inputRef = useRef<HTMLInputElement>(null);

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
      <MenuRoot
        positioning={{
          placement: "top",
          strategy: "fixed",
          offset: { mainAxis: -90, crossAxis: 0 },
        }}
        closeOnSelect={false}
      >
        <Button
          type="submit"
          size="md"
          fontSize="1.375rem"
          width="2.75rem"
          variant="solid"
          rounded="full"
          aria-label="Submit"
          loading={isLoading}
        >
          <TbSend />
        </Button>

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
          rounded="full"
          variant="solid"
          aria-label="Choose Model"
          title="Choose Model"
        >
          <TbChevronUp />
        </Button>
        <MenuContent maxHeight={"85dvh"} overflowY={"auto"}>
          <MenuItemGroup title="Providers">
            {Object.entries(providersList).map(([providerName, providerObject]) => (
              <MenuItem paddingInline={4} key={providerName} value="provider-name">
                <Container
                  onClick={() => {
                    setSettings({ ...settings, currentProvider: providerObject });
                  }}
                >
                  {settings.currentProvider.name === providerName ? (
                    <IoMdCheckmark style={{ marginRight: "0.6rem" }} />
                  ) : (
                    <span style={{ width: "1.6rem", display: "inline-block" }} />
                  )}
                  {providerName}
                </Container>
              </MenuItem>
            ))}
          </MenuItemGroup>
          <MenuSeparator />
          <MenuItemGroup title="Models">
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
                    asChild
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
            <HStack>
              <InputGroup flex="1" marginTop={2} pointerEvents="none" paddingLeft={3}>
                <TbSearch />
              </InputGroup>
              <InputGroup flex="1">
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
          </MenuItemGroup>
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
    </ButtonGroup>
  );
}

function DesktopPromptSendButton({ isLoading }: PromptSendButtonProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const { settings, setSettings } = useSettings();
  const { models } = useModels();
  const inputRef = useRef<HTMLInputElement>(null);

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
      <HStack gap={0}>
        <Button
          type="submit"
          size="sm"
          loading={isLoading}
          loadingText="Sending"
          borderRadius={"xl"}
          colorPalette={"blue"}
          bg={{
            base: "colorPalette.500",
          }}
          borderRightRadius={"none"}
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
        <Separator orientation={"vertical"} width={0} size={"lg"} />
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
              bg={{
                base: "colorPalette.500",
              }}
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
