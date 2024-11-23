import { KeyboardEvent, useRef, useState } from "react";
import {
  MenuRoot,
  MenuTrigger,
  MenuContent,
  MenuItemGroup,
  MenuItem,
  MenuSeparator,
} from "../ui/menu";
import { Tooltip } from "../ui/tooltip";
import { IconButton, Box, HStack, Input } from "@chakra-ui/react";
import { InputGroup } from "../ui/input-group";
import { Button } from "../ui/button";
import { TbChevronUp, TbSearch } from "react-icons/tb";
import { IoMdCheckmark } from "react-icons/io";
import { MdVolumeOff, MdVolumeUp } from "react-icons/md";
import { useSettings } from "../../hooks/use-settings";
import { useModels } from "../../hooks/use-models";
import { useDebounce } from "react-use";
import { ChatCraftProvider } from "../../lib/ChatCraftProvider";
import { isChatModel } from "../../lib/ai";
import useAudioPlayer from "../../hooks/use-audio-player";
import InterruptSpeechButton from "../InterruptSpeechButton";
import { useTextToSpeech } from "../../hooks/use-text-to-speech";
import { FreeModelProvider } from "../../lib/providers/DefaultProvider/FreeModelProvider";

interface CustomMenuProps {
  placement: any;
  strategy: any;
  bgColor: string;
  color?: string;
  isLoading: boolean;
  isMobile?: boolean;
}

const CustomMenu = ({
  placement,
  strategy,
  bgColor,
  color,
  isLoading,
  isMobile,
}: CustomMenuProps) => {
  const { models } = useModels();
  const { settings, setSettings } = useSettings();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { clearAudioQueue, isAudioQueueEmpty } = useAudioPlayer();
  const { isTextToSpeechSupported } = useTextToSpeech();
  const providersList = {
    ...settings.providers,
    "Free AI Models": new FreeModelProvider(),
  };
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
  useDebounce(
    () => {
      setDebouncedSearchQuery(searchQuery);
    },
    250,
    [searchQuery]
  );
  return (
    <MenuRoot
      positioning={{
        placement: placement,
        strategy: strategy,
      }}
      closeOnSelect={true}
    >
      <MenuTrigger>
        {isTextToSpeechSupported && isAudioQueueEmpty && isMobile ? (
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
      <MenuContent
        overflowY="auto"
        zIndex={1}
        onKeyDownCapture={onStartTyping}
        css={{
          maxHeight: !isMobile ? "80vh" : "85dvh",
          maxWidth: isMobile ? "300px" : "100%",
        }}
      >
        <MenuItemGroup title="Providers">
          {Object.entries(providersList).map(([providerName, providerValue]) => (
            <MenuItem
              paddingInline={4}
              key={providerName}
              onClick={() => {
                setSettings({ ...settings, currentProvider: providerValue as ChatCraftProvider });
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
        {!isMobile && (
          <MenuItem paddingInline={1} pb={2} value="model-id" title="Model" alignContent={"center"}>
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
        )}
        <MenuItemGroup paddingInline={1} pb={2} title="Model">
          <Box
            css={{
              maxH: !isMobile ? "40vh" : "40dvh",
              overflowY: "auto",
            }}
          >
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
        {isMobile && (
          <>
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
          </>
        )}
      </MenuContent>
    </MenuRoot>
  );
};

export default CustomMenu;
