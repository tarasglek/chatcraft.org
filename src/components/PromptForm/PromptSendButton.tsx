import {
  Button,
  ButtonGroup,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Tooltip,
  MenuDivider,
  MenuGroup,
  Input,
  InputGroup,
  InputLeftElement,
  Box,
} from "@chakra-ui/react";
import { TbChevronUp, TbSend, TbSearch } from "react-icons/tb";
import { FreeModelProvider } from "../../lib/providers/DefaultProvider/FreeModelProvider";

import useMobileBreakpoint from "../../hooks/use-mobile-breakpoint";
import { useSettings } from "../../hooks/use-settings";
import { useModels } from "../../hooks/use-models";
import theme from "../../theme";
import { MdVolumeUp, MdVolumeOff } from "react-icons/md";
import { IoMdCheckmark } from "react-icons/io";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import useAudioPlayer from "../../hooks/use-audio-player";
import { usingOfficialOpenAI } from "../../lib/providers";
import { useDebounce } from "react-use";
import InterruptSpeechButton from "../InterruptSpeechButton";

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
    return !!models.filter((model) => model.id.includes("tts"))?.length;
  }, [models]);

  const { clearAudioQueue, isAudioQueueEmpty } = useAudioPlayer();

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
        {isTtsSupported && isAudioQueueEmpty ? (
          <Tooltip
            label={
              settings.textToSpeech.announceMessages
                ? "Text-to-Speech Enabled"
                : "Text-to-Speech Disabled"
            }
          >
            <IconButton
              type="button"
              size="lg"
              variant="solid"
              aria-label={
                settings.textToSpeech.announceMessages
                  ? "Text-to-Speech Enabled"
                  : "Text-to-Speech Disabled"
              }
              icon={
                settings.textToSpeech.announceMessages ? (
                  <MdVolumeUp size={25} />
                ) : (
                  <MdVolumeOff size={25} />
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
            />
          </Tooltip>
        ) : isTtsSupported ? (
          <InterruptSpeechButton variant={"dancingBars"} size={"lg"} clearOnly={!isLoading} />
        ) : null}
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
                .filter((model) => !usingOfficialOpenAI() || model.id.includes("gpt"))
                .filter((model) =>
                  model.prettyModel.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
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
                      <span style={{ paddingLeft: "1.6rem", display: "inline-block" }} />
                    )}
                    {model.prettyModel}
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
    return !!models.filter((model) => model.id.includes("tts"))?.length;
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

  const { clearAudioQueue, isAudioQueueEmpty } = useAudioPlayer();

  const providersList = {
    ...settings.providers,
    "Free AI Models": new FreeModelProvider(),
  };

  return (
    <ButtonGroup isAttached>
      <Button type="submit" size="sm" isLoading={isLoading} loadingText="Sending">
        Ask {settings.model.prettyModel}
      </Button>
      {isTtsSupported && isAudioQueueEmpty ? (
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
      ) : isTtsSupported ? (
        <InterruptSpeechButton variant={"dancingBars"} size={"sm"} clearOnly={!isLoading} />
      ) : null}
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
                .filter((model) => !usingOfficialOpenAI() || model.id.includes("gpt"))
                .filter((model) =>
                  model.prettyModel.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
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
                      <span style={{ paddingLeft: "1.6rem", display: "inline-block" }} />
                    )}
                    {model.prettyModel}
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
