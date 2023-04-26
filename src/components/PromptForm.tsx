import { FormEvent, KeyboardEvent, useEffect, useState, useRef } from "react";
import {
  Box,
  Button,
  ButtonGroup,
  chakra,
  Checkbox,
  Flex,
  IconButton,
  Kbd,
  Text,
  Textarea,
  useColorModeValue,
} from "@chakra-ui/react";
import { CgChevronUpO, CgChevronDownO } from "react-icons/cg";
import { AutoResizingTextarea } from "./AutoResizingTextarea";

import { useSettings } from "../hooks/use-settings";
import { isMac, isWindows } from "../utils";

type KeyboardHintProps = {
  isVisible: boolean;
};

function KeyboardHint({ isVisible }: KeyboardHintProps) {
  const { settings } = useSettings();

  if (!isVisible) {
    return <span />;
  }

  const metaKey = isMac() ? "Command ⌘" : "Ctrl";

  return (
    <Text ml={2} fontSize="sm">
      <span>
        {settings.enterBehaviour === "send" ? (
          <span>
            <Kbd>Shift</Kbd> + <Kbd>Enter</Kbd> for newline
          </span>
        ) : (
          <span>
            <Kbd>{metaKey}</Kbd> + <Kbd>Enter</Kbd> to send
          </span>
        )}
      </span>
    </Text>
  );
}

type PromptFormProps = {
  onPrompt: (prompt: string) => void;
  onClear: () => void;
  // Whether or not to automatically manage the height of the prompt.
  // When `isExpanded` is `false`, Shit+Enter adds rows. Otherwise,
  // the height is determined automatically by the parent.
  isExpanded: boolean;
  toggleExpanded: () => void;
  singleMessageMode: boolean;
  onSingleMessageModeChange: (value: boolean) => void;
  isLoading: boolean;
  previousMessage?: string;
};

function PromptForm({
  onPrompt,
  onClear,
  isExpanded,
  toggleExpanded,
  singleMessageMode,
  onSingleMessageModeChange,
  isLoading,
  previousMessage,
}: PromptFormProps) {
  const [prompt, setPrompt] = useState("");
  // Has the user started typing?
  const [isDirty, setIsDirty] = useState(false);
  const { settings } = useSettings();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // If the user clears the prompt, allow up-arrow again
  useEffect(() => {
    if (!prompt) {
      setIsDirty(false);
    }
  }, [prompt, setIsDirty]);

  // Clear the form when loading finishes and focus the textarea again
  useEffect(() => {
    if (!isLoading) {
      setPrompt("");
      textareaRef.current?.focus();
    }
  }, [isLoading, textareaRef]);

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const value = prompt.trim();
    if (!value.length) {
      return;
    }

    onPrompt(value);
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
        // Deal with Enter key based on user preference
        if (settings.enterBehaviour === "newline") {
          if ((isMac() && e.metaKey) || (isWindows() && e.ctrlKey)) {
            handleSubmit(e);
          }
        } else if (settings.enterBehaviour === "send") {
          if (!e.shiftKey && prompt.length) {
            handleSubmit(e);
          }
        }
        break;

      default:
        setIsDirty(true);
        return;
    }
  };

  return (
    <Box h="100%" px={1}>
      <Flex justify="space-between" alignItems="baseline">
        <KeyboardHint isVisible={!!prompt.length} />

        <ButtonGroup isAttached>
          <IconButton
            aria-label={isExpanded ? "Minimize prompt area" : "Maximize prompt area"}
            title={isExpanded ? "Minimize prompt area" : "Maximize prompt area"}
            icon={isExpanded ? <CgChevronDownO /> : <CgChevronUpO />}
            variant="ghost"
            onClick={toggleExpanded}
          />
        </ButtonGroup>
      </Flex>

      <chakra.form onSubmit={handleSubmit} h="100%" pb={2}>
        <Flex pb={isExpanded ? 8 : 0} flexDir="column" h="100%">
          <Box flex={isExpanded ? "1" : undefined} mt={2} pb={2}>
            {isExpanded ? (
              <Textarea
                ref={textareaRef}
                h="100%"
                resize="none"
                disabled={isLoading}
                onKeyDown={handleKeyDown}
                autoFocus={true}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                bg={useColorModeValue("white", "gray.700")}
                placeholder="Type your question"
              />
            ) : (
              <AutoResizingTextarea
                ref={textareaRef}
                onKeyDown={handleKeyDown}
                autoFocus={true}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                bg={useColorModeValue("white", "gray.700")}
                placeholder="Type your question"
              />
            )}
          </Box>

          <Flex gap={1} justify={"space-between"} align="center">
            <Checkbox
              isDisabled={isLoading}
              checked={singleMessageMode}
              onChange={(e) => onSingleMessageModeChange(e.target.checked)}
            >
              Single Message Mode
            </Checkbox>
            <ButtonGroup>
              <Button onClick={onClear} variant="outline" size="sm">
                Clear Chat
              </Button>
              <Button
                type="submit"
                size="sm"
                isDisabled={isLoading || !prompt.length}
                isLoading={isLoading}
                loadingText="Loading"
              >
                Send
              </Button>
            </ButtonGroup>
          </Flex>
        </Flex>
      </chakra.form>
    </Box>
  );
}

export default PromptForm;
