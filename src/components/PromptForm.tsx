import { FormEvent, useEffect, useState, useRef } from "react";
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
  useBoolean,
  useColorModeValue,
} from "@chakra-ui/react";
import { CgChevronUpO, CgChevronDownO } from "react-icons/cg";

import { AutoResizingTextarea } from "./AutoResizingTextarea";

type PromptFormProps = {
  onPrompt: (prompt: string, lastMsgMode: boolean) => void;
  onClear: () => void;
  // Whether or not to automatically manage the height of the prompt.
  // When `isExpanded` is `false`, Shit+Enter adds rows. Otherwise,
  // the height is determined automatically by the parent.
  isExpanded: boolean;
  toggleExpanded: () => void;
  isLoading: boolean;
};

function PromptForm({ onPrompt, onClear, isExpanded, toggleExpanded, isLoading }: PromptFormProps) {
  const [prompt, setPrompt] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [lastMsgMode, setLastMsgMode] = useBoolean(false);

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

    onPrompt(value, lastMsgMode);
  };

  // Prevent blank submissions and allow for multiline input
  const handleEnter = (e: any) => {
    if (e.key === "Enter" && prompt.length) {
      if (!e.shiftKey && prompt.length) {
        handleSubmit(e as any);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
    }
  };

  return (
    <Box h="100%" px={1}>
      <Flex justify="space-between" alignItems="baseline">
        <Text ml={2} fontSize="sm">
          {!!prompt.length && (
            <span>
              <Kbd>Shift</Kbd> + <Kbd>Enter</Kbd> for newline
            </span>
          )}
        </Text>

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
                onKeyDown={handleEnter}
                autoFocus={true}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                bg={useColorModeValue("white", "gray.700")}
                placeholder="Type your question"
              />
            ) : (
              <AutoResizingTextarea
                ref={textareaRef}
                onKeyDown={handleEnter}
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
              checked={lastMsgMode}
              onChange={() => setLastMsgMode.toggle()}
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
