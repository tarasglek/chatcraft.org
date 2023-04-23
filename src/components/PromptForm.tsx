import { FormEvent, useEffect, useState, useRef } from "react";
import {
  Box,
  Button,
  ButtonGroup,
  chakra,
  Checkbox,
  Flex,
  Kbd,
  Text,
  Textarea,
  useBoolean,
  useColorModeValue,
} from "@chakra-ui/react";

type PromptFormProps = {
  onPrompt: (prompt: string, lastMsgMode: boolean) => void;
  onClear: () => void;
  isExpanded: boolean;
  isLoading: boolean;
};

function PromptForm({ onPrompt, onClear, isExpanded, isLoading }: PromptFormProps) {
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
      <Text ml={2} fontSize="sm">
        Type your question.{" "}
        {!!prompt.length && (
          <>
            {" "}
            <Kbd>Shift</Kbd> + <Kbd>Enter</Kbd> for newline
          </>
        )}
      </Text>
      <chakra.form onSubmit={handleSubmit} h="100%" pb={2}>
        <Flex pb={8} flexDir="column" h="100%">
          <Box flex="1" mt={2} pb={2}>
            <Textarea
              ref={textareaRef}
              required
              h="100%"
              flex="1"
              rows={!isExpanded ? 1 : undefined}
              resize="none"
              disabled={isLoading}
              onKeyDown={handleEnter}
              autoFocus={true}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              bg={useColorModeValue("white", "gray.700")}
            />
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
