import { FormEvent, KeyboardEvent, useEffect, useState, type RefObject } from "react";
import {
  Box,
  Button,
  ButtonGroup,
  chakra,
  Checkbox,
  Flex,
  IconButton,
  Kbd,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Text,
  Textarea,
  HStack,
  Tag,
  InputGroup,
  InputRightElement,
} from "@chakra-ui/react";
import { CgChevronUpO, CgChevronDownO } from "react-icons/cg";
import { TbChevronUp, TbMicrophone } from "react-icons/tb";
import AutoResizingTextarea from "./AutoResizingTextarea";

import { useSettings } from "../hooks/use-settings";
import { useModels } from "../hooks/use-models";
import { isMac, isWindows, formatCurrency } from "../lib/utils";
import NewButton from "./NewButton";
import { useCost } from "../hooks/use-cost";
import MicIcon from "./MicIcon";
import { isTranscriptionSupported } from "../lib/speech-recognition";

type SpeechRecognitionHintProps = {
  isRecording: boolean;
  isTranscribing: boolean;
};

function SpeechRecognitionHint({ isTranscribing, isRecording }: SpeechRecognitionHintProps) {
  let message: string | null = null;
  if (isTranscribing) {
    message = "Transcribing with OpenAI...";
  }
  if (isRecording) {
    message = "Recording... (release to stop, slide left to cancel)";
  }

  if (!isTranscriptionSupported() || !message) {
    return <span />;
  }

  return (
    <Flex alignItems="center" my={2}>
      <Box mr={2}>
        <TbMicrophone />
      </Box>
      <Text fontSize="md">{message}</Text>
    </Flex>
  );
}

type KeyboardHintProps = {
  isVisible: boolean;
  isExpanded: boolean;
};

function KeyboardHint({ isVisible, isExpanded }: KeyboardHintProps) {
  const { settings } = useSettings();

  if (!isVisible) {
    return <span />;
  }

  const metaKey = isMac() ? "Command ⌘" : "Ctrl";

  return (
    <Text fontSize="sm">
      <span>
        {settings.enterBehaviour === "newline" || isExpanded ? (
          <span>
            <Kbd>{metaKey}</Kbd> + <Kbd>Enter</Kbd> to send
          </span>
        ) : (
          <span>
            <Kbd>Shift</Kbd> + <Kbd>Enter</Kbd> for newline
          </span>
        )}
      </span>
    </Text>
  );
}

type PromptFormProps = {
  forkUrl: string;
  onSendClick: (prompt: string) => void;
  // Whether or not to automatically manage the height of the prompt.
  // When `isExpanded` is `false`, Shit+Enter adds rows. Otherwise,
  // the height is determined automatically by the parent.
  isExpanded: boolean;
  toggleExpanded: () => void;
  singleMessageMode: boolean;
  onSingleMessageModeChange: (value: boolean) => void;
  inputPromptRef: RefObject<HTMLTextAreaElement>;
  isLoading: boolean;
  previousMessage?: string;
};

function PromptForm({
  forkUrl,
  onSendClick,
  isExpanded,
  toggleExpanded,
  singleMessageMode,
  onSingleMessageModeChange,
  inputPromptRef,
  isLoading,
  previousMessage,
}: PromptFormProps) {
  const [prompt, setPrompt] = useState("");
  // Has the user started typing?
  const [isDirty, setIsDirty] = useState(false);
  const { settings, setSettings } = useSettings();
  const { models } = useModels();
  const { cost } = useCost();
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const inputType = isRecording || isTranscribing ? "audio" : "text";

  // If the user clears the prompt, allow up-arrow again
  useEffect(() => {
    if (!prompt) {
      setIsDirty(false);
    }
  }, [prompt, setIsDirty]);

  useEffect(() => {
    if (!isLoading) {
      inputPromptRef.current?.focus();
    }
  }, [isLoading, inputPromptRef]);

  // Handle prompt form submission
  const handlePromptSubmit = (e: FormEvent) => {
    e.preventDefault();
    const value = prompt.trim();
    if (!value.length) {
      return;
    }

    setPrompt("");
    onSendClick(value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    switch (e.key) {
      // Allow the user to cursor-up to repeat last prompt
      case "ArrowUp":
        if (!isDirty && previousMessage) {
          e.preventDefault();
          setPrompt(previousMessage);
          setIsDirty(true);
        }
        break;

      // Prevent blank submissions and allow for multiline input.
      case "Enter":
        // Deal with Enter key based on user preference and state of prompt form
        if (settings.enterBehaviour === "newline" || isExpanded) {
          if ((isMac() && e.metaKey) || (isWindows() && e.ctrlKey)) {
            handlePromptSubmit(e);
          }
        } else if (settings.enterBehaviour === "send") {
          if (!e.shiftKey && prompt.length) {
            handlePromptSubmit(e);
          }
        }
        break;

      default:
        setIsDirty(true);
        return;
    }
  };

  const handleRecording = () => {
    setIsRecording(true);
    setIsTranscribing(false);
  };

  const handleTranscribing = () => {
    setIsRecording(false);
    setIsTranscribing(true);
  };

  const handleRecordingCancel = () => {
    setIsRecording(false);
    setIsTranscribing(false);
  };

  const handleTranscriptionAvailable = (transcription: string) => {
    console.log("transcript available");
    // Use this transcript as our prompt
    onSendClick(transcription);
    setIsRecording(false);
    setIsTranscribing(false);
  };

  return (
    <Flex direction="column" h="100%" px={1}>
      {settings.apiKey && (
        <Flex justify="space-between" alignItems="baseline" w="100%">
          <HStack>
            <ButtonGroup isAttached>
              {inputType === "text" && (
                <IconButton
                  aria-label={isExpanded ? "Minimize prompt area" : "Maximize prompt area"}
                  title={isExpanded ? "Minimize prompt area" : "Maximize prompt area"}
                  icon={isExpanded ? <CgChevronDownO /> : <CgChevronUpO />}
                  variant="ghost"
                  isDisabled={isLoading}
                  onClick={toggleExpanded}
                />
              )}
            </ButtonGroup>

            <KeyboardHint isVisible={!!prompt.length && !isLoading} isExpanded={isExpanded} />
            <SpeechRecognitionHint isRecording={isRecording} isTranscribing={isTranscribing} />
          </HStack>

          {settings.countTokens && (
            <Tag key="token-cost" size="sm">
              {formatCurrency(cost)}
            </Tag>
          )}
        </Flex>
      )}

      <Box flex={1} w="100%">
        {/* If we have an API Key in storage, show the chat form */}
        {settings.apiKey ? (
          <chakra.form onSubmit={handlePromptSubmit} h="100%" pb={2}>
            <Flex flexDir="column" h={isExpanded ? "100%" : undefined}>
              <Box
                flex={isExpanded ? "1" : undefined}
                mt={2}
                pb={2}
                h={isExpanded ? "100%" : undefined}
              >
                {isExpanded ? (
                  <InputGroup h="100%">
                    <Textarea
                      ref={inputPromptRef}
                      h="100%"
                      resize="none"
                      isDisabled={isLoading}
                      onKeyDown={handleKeyDown}
                      autoFocus={true}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      bg="white"
                      _dark={{ bg: "gray.700" }}
                      placeholder={
                        !isLoading && !isRecording && !isTranscribing
                          ? "Type your question or use your voice by holding the microphone icon. Type /help for more info."
                          : undefined
                      }
                      overflowY="auto"
                      pr={isTranscriptionSupported() ? 12 : undefined}
                    />
                    {isTranscriptionSupported() && (
                      <InputRightElement mr={2}>
                        <MicIcon
                          isDisabled={isLoading}
                          onRecording={handleRecording}
                          onTranscribing={handleTranscribing}
                          onTranscriptionAvailable={handleTranscriptionAvailable}
                          onCancel={handleRecordingCancel}
                        />
                      </InputRightElement>
                    )}
                  </InputGroup>
                ) : (
                  <InputGroup h="100%">
                    <AutoResizingTextarea
                      ref={inputPromptRef}
                      onKeyDown={handleKeyDown}
                      isDisabled={isLoading}
                      autoFocus={true}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      bg="white"
                      _dark={{ bg: "gray.700" }}
                      placeholder={
                        !isLoading && !isRecording && !isTranscribing
                          ? "Type your question or use your voice by holding the microphone icon. Type /help for more info."
                          : undefined
                      }
                      overflowY="auto"
                      pr={isTranscriptionSupported() ? 8 : undefined}
                    />
                    {isTranscriptionSupported() && (
                      <InputRightElement>
                        <MicIcon
                          isDisabled={isLoading}
                          onRecording={handleRecording}
                          onTranscribing={handleTranscribing}
                          onTranscriptionAvailable={handleTranscriptionAvailable}
                          onCancel={handleRecordingCancel}
                        />
                      </InputRightElement>
                    )}
                  </InputGroup>
                )}
              </Box>

              <Flex gap={1} justify={"space-between"} align="center">
                <Checkbox
                  isDisabled={isLoading}
                  checked={singleMessageMode}
                  onChange={(e) => onSingleMessageModeChange(e.target.checked)}
                >
                  Single Message
                </Checkbox>

                <Flex gap={2} align="center">
                  <NewButton forkUrl={forkUrl} variant="outline" />
                  <ButtonGroup isAttached>
                    <Button type="submit" size="sm" isLoading={isLoading} loadingText="Sending">
                      Ask {settings.model.prettyModel}
                    </Button>
                    <Menu>
                      <MenuButton
                        as={IconButton}
                        size="sm"
                        aria-label="Choose Model"
                        title="Choose Model"
                        icon={<TbChevronUp />}
                      />
                      <MenuList>
                        {models.map((model) => (
                          <MenuItem
                            key={model.id}
                            onClick={() => setSettings({ ...settings, model })}
                          >
                            {model.prettyModel}
                          </MenuItem>
                        ))}
                      </MenuList>
                    </Menu>
                  </ButtonGroup>
                </Flex>
              </Flex>
            </Flex>
          </chakra.form>
        ) : null}
      </Box>
    </Flex>
  );
}

export default PromptForm;
