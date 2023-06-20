import { FormEvent, KeyboardEvent, useEffect, useState, type RefObject, useCallback } from "react";
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
  useDisclosure,
  MenuDivider,
  useToast,
} from "@chakra-ui/react";
import { CgChevronUpO, CgChevronDownO } from "react-icons/cg";
import { TbShare2, TbChevronUp } from "react-icons/tb";
import { useCopyToClipboard } from "react-use";

import AutoResizingTextarea from "./AutoResizingTextarea";

import { useSettings } from "../hooks/use-settings";
import { useModels } from "../hooks/use-models";
import { isMac, isWindows, formatNumber, formatCurrency, download } from "../lib/utils";
import ShareModal from "./ShareModal";
import NewButton from "./NewButton";
import { ChatCraftChat } from "../lib/ChatCraftChat";

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
  chat: ChatCraftChat;
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
  tokenInfo?: TokenInfo;
};

function PromptForm({
  chat,
  forkUrl,
  onSendClick,
  isExpanded,
  toggleExpanded,
  singleMessageMode,
  onSingleMessageModeChange,
  inputPromptRef,
  isLoading,
  previousMessage,
  tokenInfo,
}: PromptFormProps) {
  const [prompt, setPrompt] = useState("");
  const { isOpen, onOpen, onClose } = useDisclosure();
  // Has the user started typing?
  const [isDirty, setIsDirty] = useState(false);
  const { settings, setSettings } = useSettings();
  const { models } = useModels();
  const [, copyToClipboard] = useCopyToClipboard();
  const toast = useToast();

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

  const handleCopyMessages = useCallback(() => {
    const text = chat.toMarkdown();
    copyToClipboard(text);
    toast({
      colorScheme: "blue",
      title: "Messages copied to clipboard",
      status: "success",
      position: "top",
      isClosable: true,
    });
  }, [chat, copyToClipboard, toast]);

  const handleDownloadMessages = useCallback(() => {
    const text = chat.toMarkdown();
    download(text, "chat.md", "text/markdown");
    toast({
      colorScheme: "blue",
      title: "Messages downloaded as file",
      status: "success",
      position: "top",
      isClosable: true,
    });
  }, [chat, toast]);

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

          <HStack>
            {
              /* Only bother with cost if it's $0.01 or more */
              tokenInfo?.cost && tokenInfo?.cost >= 0.01 && (
                <Tag key="token-cost" size="sm">
                  {formatCurrency(tokenInfo.cost)}
                </Tag>
              )
            }
            {tokenInfo?.count && (
              <Tag key="token-count" size="sm">
                {formatNumber(tokenInfo.count)} Tokens
              </Tag>
            )}

            <Box>
              <Menu>
                <MenuButton
                  as={IconButton}
                  aria-label="User Settings"
                  title="User Settings"
                  icon={<TbShare2 />}
                  variant="ghost"
                />
                <MenuList>
                  <MenuItem onClick={() => handleCopyMessages()}>Copy to Clipboard</MenuItem>
                  <MenuItem onClick={() => handleDownloadMessages()}>Download as File</MenuItem>
                  <MenuDivider />
                  <MenuItem onClick={() => onOpen()}>Create Public URL...</MenuItem>
                </MenuList>
              </Menu>
            </Box>
            <ShareModal
              chat={chat}
              isOpen={isOpen}
              onClose={onClose}
              finalFocusRef={inputPromptRef}
            />
          </HStack>
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
                    placeholder={!isLoading ? "Type your question" : undefined}
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
