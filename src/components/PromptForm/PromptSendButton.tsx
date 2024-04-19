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
} from "@chakra-ui/react";
import { TbChevronUp, TbSend, TbSearch } from "react-icons/tb";
import { FreeModelProvider } from "../../lib/providers/DefaultProvider/FreeModelProvider";

import useMobileBreakpoint from "../../hooks/use-mobile-breakpoint";
import { useSettings } from "../../hooks/use-settings";
import { useModels } from "../../hooks/use-models";
import theme from "../../theme";
import { MdVolumeUp, MdVolumeOff, MdOutlineChevronRight } from "react-icons/md";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import useAudioPlayer from "../../hooks/use-audio-player";
import { usingOfficialOpenAI } from "../../lib/providers";
import { useDebounce } from "react-use";

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
          size="lg"
          variant="solid"
          isRound
          aria-label="Submit"
          isLoading={isLoading}
          icon={<TbSend />}
        />
        {isTtsSupported && (
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
        )}
        <MenuButton
          as={IconButton}
          size="lg"
          isRound
          variant="solid"
          aria-label="Choose Model"
          title="Choose Model"
          icon={<TbChevronUp />}
        />
        <MenuList maxHeight={"70vh"} overflowY={"auto"} zIndex={theme.zIndices.dropdown}>
          <MenuGroup title="Models">
            <InputGroup>
              <InputLeftElement pointerEvents="none">
                <TbSearch />
              </InputLeftElement>
              <Input
                ref={inputRef}
                type="text"
                variant="ghost"
                placeholder="Search models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </InputGroup>
            {models
              .filter((model) => !usingOfficialOpenAI() || model.id.includes("gpt"))
              .filter((model) =>
                model.prettyModel.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
              )
              .map((model) => (
                <MenuItem
                  closeOnSelect={true}
                  key={model.id}
                  onClick={() => setSettings({ ...settings, model })}
                >
                  {settings.model.id === model.id ? (
                    <MdOutlineChevronRight style={{ marginRight: "4px" }} />
                  ) : (
                    <span style={{ width: "24px", display: "inline-block" }} />
                  )}
                  {model.prettyModel}
                </MenuItem>
              ))}
          </MenuGroup>
          <MenuDivider />
          <MenuGroup title="Providers">
            {Object.entries(providersList).map(([providerName, providerObject]) => (
              <MenuItem
                key={providerName}
                onClick={() => {
                  setSettings({ ...settings, currentProvider: providerObject });
                }}
              >
                {settings.currentProvider.name === providerName ? (
                  <MdOutlineChevronRight style={{ marginRight: "4px" }} />
                ) : (
                  <span style={{ width: "24px", display: "inline-block" }} />
                )}
                {providerName}
              </MenuItem>
            ))}
          </MenuGroup>
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
      // Don't handle the keydown event more than once
      e.preventDefault();
      // Make sure we are focused on the input element
      inputRef.current.focus();
      // Ignore control keys
      const char = e.key.length === 1 ? e.key : "";
      // Set the initial character in the input so we don't lose it
      setSearchQuery(searchQuery + char);
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
      <Menu
        placement="top"
        strategy="fixed"
        closeOnSelect={false}
        onClose={() => setSearchQuery("")}
      >
        <MenuButton
          as={IconButton}
          size="sm"
          aria-label="Choose Model"
          title="Choose Model"
          icon={<TbChevronUp />}
        />
        <MenuList
          maxHeight={"70vh"}
          overflowY={"auto"}
          zIndex={theme.zIndices.dropdown}
          onKeyDownCapture={onStartTyping}
        >
          <MenuGroup title="Models">
            <InputGroup>
              <InputLeftElement pointerEvents="none">
                <TbSearch />
              </InputLeftElement>
              <Input
                ref={inputRef}
                type="text"
                variant="ghost"
                placeholder="Search models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </InputGroup>
            {models
              .filter((model) => !usingOfficialOpenAI() || model.id.includes("gpt"))
              .filter((model) =>
                model.prettyModel.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
              )
              .map((model) => (
                <MenuItem
                  closeOnSelect={true}
                  key={model.id}
                  onClick={() => setSettings({ ...settings, model })}
                >
                  {settings.model.id === model.id ? (
                    <MdOutlineChevronRight style={{ marginRight: "4px" }} />
                  ) : (
                    <span style={{ width: "24px", display: "inline-block" }} />
                  )}
                  {model.prettyModel}
                </MenuItem>
              ))}
          </MenuGroup>
          <MenuDivider />
          <MenuGroup title="Providers">
            {Object.entries(providersList).map(([providerName, providerObject]) => (
              <MenuItem
                key={providerName}
                onClick={() => {
                  setSettings({ ...settings, currentProvider: providerObject });
                }}
              >
                {settings.currentProvider.name === providerName ? (
                  <MdOutlineChevronRight style={{ marginRight: "4px" }} />
                ) : (
                  <span style={{ width: "24px", display: "inline-block" }} />
                )}
                {providerName}
              </MenuItem>
            ))}
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
