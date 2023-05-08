import { FormEvent, KeyboardEvent, useEffect, useState, useRef } from "react";
import {
  Box,
  Button,
  ButtonGroup,
  chakra,
  Checkbox,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Link,
  IconButton,
  Kbd,
  Text,
  Textarea,
  HStack,
  Tag,
} from "@chakra-ui/react";
import { CgChevronUpO, CgChevronDownO, CgInfo } from "react-icons/cg";

import AutoResizingTextarea from "./AutoResizingTextarea";
import RevealablePasswordInput from "./RevealablePasswordInput";

import { useSettings } from "../hooks/use-settings";
import { isMac, isWindows, formatNumber, formatCurrency } from "../utils";

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
    <Text ml={2} fontSize="sm">
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

type LoadingHintProps = {
  isPaused: boolean;
};

function LoadingHint({ isPaused }: LoadingHintProps) {
  return (
    <Text ml={2} fontSize="sm" color="gray.400" _dark={{ color: "gray.500" }}>
      <span>
        {isPaused ? (
          <span>Paused</span>
        ) : (
          <span>
            <em>Loading...</em>
          </span>
        )}
      </span>
    </Text>
  );
}

type PromptFormProps = {
  onPrompt: (prompt: string) => void;
  onClear: () => void;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  // Whether or not to automatically manage the height of the prompt.
  // When `isExpanded` is `false`, Shit+Enter adds rows. Otherwise,
  // the height is determined automatically by the parent.
  isExpanded: boolean;
  toggleExpanded: () => void;
  singleMessageMode: boolean;
  onSingleMessageModeChange: (value: boolean) => void;
  isLoading: boolean;
  previousMessage?: string;
  tokenInfo?: TokenInfo;
};

function PromptForm({
  onPrompt,
  onClear,
  isPaused,
  onPause,
  onResume,
  onCancel,
  isExpanded,
  toggleExpanded,
  singleMessageMode,
  onSingleMessageModeChange,
  isLoading,
  previousMessage,
  tokenInfo,
}: PromptFormProps) {
  const [prompt, setPrompt] = useState("");
  // Has the user started typing?
  const [isDirty, setIsDirty] = useState(false);
  const { settings, setSettings } = useSettings();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // If the user clears the prompt, allow up-arrow again
  useEffect(() => {
    if (!prompt) {
      setIsDirty(false);
    }
  }, [prompt, setIsDirty]);

  useEffect(() => {
    if (!isLoading) {
      textareaRef.current?.focus();
    }
  }, [isLoading, textareaRef]);

  // Handle prompt form submission
  const handlePromptSubmit = (e: FormEvent) => {
    e.preventDefault();
    const value = prompt.trim();
    if (!value.length) {
      return;
    }

    setPrompt("");
    onPrompt(value);
  };

  // Handle API key form submission
  const handleApiKeySubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.target as HTMLFormElement);
    const apiKey = data.get("api-key");

    if (typeof apiKey === "string") {
      setSettings({ ...settings, apiKey: apiKey.trim() });
    }
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
    <Box h="100%" px={1}>
      <Flex justify="space-between" alignItems="baseline">
        {isLoading ? (
          <LoadingHint isPaused={isPaused} />
        ) : (
          <KeyboardHint isVisible={!!prompt.length && !isLoading} isExpanded={isExpanded} />
        )}

        <HStack>
          {
            /* Only bother with cost if it's $0.01 or more */
            tokenInfo?.cost && tokenInfo?.cost >= 0.01 && (
              <Tag size="sm">{formatCurrency(tokenInfo.cost)}</Tag>
            )
          }
          {tokenInfo?.count && <Tag size="sm">{formatNumber(tokenInfo.count)} Tokens</Tag>}

          <ButtonGroup isAttached>
            <IconButton
              aria-label={isExpanded ? "Minimize prompt area" : "Maximize prompt area"}
              title={isExpanded ? "Minimize prompt area" : "Maximize prompt area"}
              icon={isExpanded ? <CgChevronDownO /> : <CgChevronUpO />}
              variant="ghost"
              onClick={toggleExpanded}
            />
          </ButtonGroup>
        </HStack>
      </Flex>

      {/* If we have an API Key in storage, show the chat form;
          otherwise give the user a form to enter their API key. */}
      {settings.apiKey ? (
        <chakra.form onSubmit={handlePromptSubmit} h="100%" pb={2}>
          <Flex pb={isExpanded ? 8 : 0} flexDir="column" h="100%">
            <Box flex={isExpanded ? "1" : undefined} mt={2} pb={2}>
              {isExpanded ? (
                <Textarea
                  ref={textareaRef}
                  h="100%"
                  resize="none"
                  isDisabled={isLoading}
                  onKeyDown={handleKeyDown}
                  autoFocus={true}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  bg="white"
                  _dark={{ bg: "gray.700" }}
                  placeholder={!isLoading ? "Type your question" : undefined}
                  overflowY="auto"
                />
              ) : (
                <AutoResizingTextarea
                  ref={textareaRef}
                  onKeyDown={handleKeyDown}
                  isDisabled={isLoading}
                  autoFocus={true}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  bg="white"
                  _dark={{ bg: "gray.700" }}
                  placeholder={!isLoading ? "Type your question" : undefined}
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
                Single Message Mode
              </Checkbox>
              <ButtonGroup>
                {!isLoading && (
                  <Button onClick={onClear} variant="outline" size="sm" isDisabled={isLoading}>
                    Clear Chat
                  </Button>
                )}

                {isLoading && isPaused && (
                  <Button size="sm" variant="outline" onClick={() => onResume()}>
                    Resume
                  </Button>
                )}
                {isLoading && !isPaused && (
                  <Button size="sm" variant="outline" onClick={() => onPause()}>
                    Pause
                  </Button>
                )}

                {isLoading && (
                  <Button size="sm" onClick={() => onCancel()}>
                    Cancel
                  </Button>
                )}

                {!isLoading && (
                  <Button type="submit" size="sm">
                    Send
                  </Button>
                )}
              </ButtonGroup>
            </Flex>
          </Flex>
        </chakra.form>
      ) : (
        <chakra.form onSubmit={handleApiKeySubmit} autoComplete="off" h="100%" pb={2}>
          <FormControl>
            <FormLabel>
              <HStack>
                <CgInfo />
                <Text>
                  Please enter your{" "}
                  <Link
                    href="https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety"
                    textDecoration="underline"
                  >
                    OpenAI API Key
                  </Link>
                </Text>
              </HStack>
            </FormLabel>
            <Flex>
              <RevealablePasswordInput
                flex="1"
                type="password"
                name="api-key"
                bg="white"
                _dark={{ bg: "gray.700" }}
                required
              />
              <Button ml={3} type="submit">
                Save
              </Button>
            </Flex>
            <FormHelperText>
              Your API Key will be stored offline in your browser&apos;s{" "}
              <Link
                href="https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage"
                textDecoration="underline"
              >
                local storage
              </Link>
            </FormHelperText>
          </FormControl>
        </chakra.form>
      )}
    </Box>
  );
}

export default PromptForm;
