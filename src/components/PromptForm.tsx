import { FormEvent, useEffect, useState, useRef } from "react";
import {
  Box,
  Button,
  ButtonGroup,
  chakra,
  Checkbox,
  Flex,
  Select,
  Stack,
  Textarea,
  useBoolean,
} from "@chakra-ui/react";

type PromptFormProps = {
  onPrompt: (prompt: string, model: GptModel, lastMsgMode: boolean) => void;
  onClear: () => void;
  isExpanded: boolean;
  isLoading: boolean;
};

function PromptForm({ onPrompt, onClear, isExpanded, isLoading }: PromptFormProps) {
  const [prompt, setPrompt] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [lastMsgMode, setLastMsgMode] = useBoolean(false);
  const [model, setModel] = useState<GptModel>("gpt-3.5-turbo");

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

    onPrompt(value, model, lastMsgMode);
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
    <chakra.form onSubmit={handleSubmit} h="100%" pb={2} mx={2}>
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
          />
        </Box>

        <Flex gap={2} justify={"space-between"} align="center">
          <Stack spacing={6} direction="row" alignItems="center">
            <Checkbox
              isDisabled={isLoading}
              colorScheme="blue"
              checked={lastMsgMode}
              onChange={() => setLastMsgMode.toggle()}
            >
              Single Message Mode
            </Checkbox>

            <Stack direction="row" alignItems="center">
              <label htmlFor="gpt-model">Model</label>
              <Select
                id="gpt-model"
                size="sm"
                value={model}
                onChange={(e) => setModel(e.target.value as GptModel)}
                isDisabled={isLoading}
              >
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">ChatGPT</option>
              </Select>
            </Stack>
          </Stack>
          <ButtonGroup>
            <Button onClick={onClear} colorScheme="blue" variant="outline" size="sm">
              Clear Chat
            </Button>
            <Button
              type="submit"
              size="sm"
              isDisabled={isLoading || !prompt.length}
              colorScheme="blue"
              isLoading={isLoading}
              loadingText="Loading"
            >
              Send
            </Button>
          </ButtonGroup>
        </Flex>
      </Flex>
    </chakra.form>
  );
}

export default PromptForm;
