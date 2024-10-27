import {
  Box,
  Button,
  ButtonGroup,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuDivider,
  MenuGroup,
  MenuItem,
  MenuList,
  Tooltip,
} from "@chakra-ui/react";
import { TbChevronUp, TbSearch, TbSend } from "react-icons/tb";
import { FreeModelProvider } from "../../lib/providers/DefaultProvider/FreeModelProvider";

import useMobileBreakpoint from "../../hooks/use-mobile-breakpoint";
import { useSettings } from "../../hooks/use-settings";
import { useModels } from "../../hooks/use-models";
import theme from "../../theme";
import { MdVolumeOff, MdVolumeUp } from "react-icons/md";
import { IoMdCheckmark } from "react-icons/io";
import { type KeyboardEvent, useMemo, useRef, useState } from "react";
import useAudioPlayer from "../../hooks/use-audio-player";
import { useDebounce } from "react-use";
import { isChatModel, isTextToSpeechModel } from "../../lib/ai";

type PromptSendButtonProps = {
  isLoading: boolean;
};

function MobilePromptSendButton({ isLoading }: PromptSendButtonProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const { settings, setSettings } = useSettings();
  const { models } = useModels();
  const inputRef = useRef<HTMLInputElement>(null);

  const isTtsSupported = useMemo(() => {
    return !!models.find((model) => isTextToSpeechModel(model.id));
  }, [models]);

  const { clearAudioQueue } = useAudioPlayer();

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
    <ButtonGroup variant="outline" isAttached>
      <Menu placement="top" strategy="fixed" closeOnSelect={false} offset={[-90, 0]}>
        <IconButton
          type="submit"
          size="md"
          fontSize="1.375rem"
          width="2.75rem"
          variant="solid"
          isRound
          aria-label="Submit"
          isLoading={isLoading}
          icon={<TbSend />}
        />
        <MenuButton
          as={IconButton}
          size="md"
          width="2.75rem"
          fontSize="1.375rem"
          isRound
          variant="solid"
          aria-label="Choose Model"
          title="Choose Model"
          icon={<TbChevronUp />}
        />
        <MenuList maxHeight={"85dvh"} overflowY={"auto"} zIndex={theme.zIndices.dropdown}>
          <MenuGroup title="Providers">
            {Object.entries(providersList).map(([providerName, providerObject]) => (
              <MenuItem
                paddingInline={4}
                key={providerName}
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
              </MenuItem>
            ))}
          </MenuGroup>
          <MenuDivider />
          <MenuGroup title="Models">
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
            <InputGroup marginTop={2}>
              <InputLeftElement paddingLeft={3} pointerEvents="none">
                <TbSearch />
              </InputLeftElement>
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
          </MenuGroup>
          {isTtsSupported && (
            <>
              <MenuDivider />
              <MenuItem
                icon={
                  settings.textToSpeech.announceMessages ? (
                    <MdVolumeUp style={{ fontSize: "1.25rem" }} />
                  ) : (
                    <MdVolumeOff style={{ fontSize: "1.25rem" }} />
                  )
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
                {settings.textToSpeech.announceMessages
                  ? "Text-to-Speech Enabled"
                  : "Text-to-Speech Disabled"}
              </MenuItem>
            </>
          )}
        </MenuList>
      </Menu>
    </ButtonGroup>
  );
}

function DesktopPromptSendButton({ isLoading }: PromptSendButtonProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const { settings, setSettings } = useSettings();
  const { models } = useModels();
  const isTtsSupported = useMemo(() => {
    return !!models.find((model) => isTextToSpeechModel(model.id));
  }, [models]);
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

  const { clearAudioQueue } = useAudioPlayer();

  const providersList = {
    ...settings.providers,
    "Free AI Models": new FreeModelProvider(),
  };

  return (
    <ButtonGroup isAttached>
      <Button type="submit" size="sm" isLoading={isLoading} loadingText="Sending">
        Ask {settings.model.prettyModel}
      </Button>
      {isTtsSupported && (
        <Tooltip
          label={
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
            {settings.textToSpeech.announceMessages ? (
              <MdVolumeUp size={18} />
            ) : (
              <MdVolumeOff size={18} />
            )}
          </Button>
        </Tooltip>
      )}
      <Menu placement="top-end" strategy="fixed" closeOnSelect={false}>
        <MenuButton
          as={IconButton}
          size="sm"
          fontSize="1.25rem"
          aria-label="Choose Model"
          title="Choose Model"
          icon={<TbChevronUp />}
        />
        <MenuList
          maxHeight={"80vh"}
          overflowY={"auto"}
          zIndex={theme.zIndices.dropdown}
          onKeyDownCapture={onStartTyping}
        >
          <MenuGroup title="Providers">
            {Object.entries(providersList).map(([providerName, providerObject]) => (
              <MenuItem
                paddingInline={4}
                key={providerName}
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
              </MenuItem>
            ))}
          </MenuGroup>
          <MenuDivider />
          <MenuGroup title="Models">
            <InputGroup>
              <InputLeftElement paddingLeft={3} pointerEvents="none">
                <TbSearch />
              </InputLeftElement>
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
            <Box maxHeight="40vh" overflowY="auto">
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
          </MenuGroup>
        </MenuList>
      </Menu>
    </ButtonGroup>
  );
}

export default function PromptSendButton(props: PromptSendButtonProps) {
  const isMobile = useMobileBreakpoint();

  return isMobile ? <MobilePromptSendButton {...props} /> : <DesktopPromptSendButton {...props} />;
}
