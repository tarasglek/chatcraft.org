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
} from "@chakra-ui/react";
import { CgChevronUpO, CgChevronDownO } from "react-icons/cg";
import { TbChevronUp } from "react-icons/tb";

import AutoResizingTextarea from "./AutoResizingTextarea";

import { useSettings } from "../hooks/use-settings";
import { useModels } from "../hooks/use-models";
import { isMac, isWindows, formatCurrency } from "../lib/utils";
import NewButton from "./NewButton";
import { useCost } from "../hooks/use-cost";

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

  return (
    <Flex direction="column" h="100%" px={1}>
      {settings.apiKey && (
        <Flex justify="space-between" alignItems="baseline" w="100%">
          <HStack>
            <ButtonGroup isAttached>
              <IconButton
                aria-label={isExpanded ? "Minimize prompt area" : "Maximize prompt area"}
                title={isExpanded ? "Minimize prompt area" : "Maximize prompt area"}
                icon={isExpanded ? <CgChevronDownO /> : <CgChevronUpO />}
                variant="ghost"
                isDisabled={isLoading}
                onClick={toggleExpanded}
              />
            </ButtonGroup>

            <KeyboardHint isVisible={!!prompt.length && !isLoading} isExpanded={isExpanded} />
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
                      !isLoading
                        ? "Type your question. Include @fn:name or @fn-url:https://... to call functions"
                        : undefined
                    }
                    overflowY="auto"
                  />
                ) : (
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
                      !isLoading
                        ? "Type your question. Include @fn:name or @fn-url:https://... to call functions"
                        : undefined
                    }
                    overflowY="auto"
                  />
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
