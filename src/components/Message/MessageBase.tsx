import {
  memo,
  startTransition,
  useCallback,
  useState,
  useEffect,
  useRef,
  type ReactNode,
  type MouseEvent,
  type FormEvent,
  useMemo,
} from "react";
import {
  Box,
  Button,
  ButtonGroup,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Flex,
  Heading,
  IconButton,
  Link,
  Tag,
  Text,
  Textarea,
  VStack,
  useClipboard,
  Kbd,
  Spacer,
  useDisclosure,
} from "@chakra-ui/react";

import { Menu, MenuItem, SubMenu, MenuDivider } from "../Menu";
import ResizeTextarea from "react-textarea-autosize";
import { TbTrash } from "react-icons/tb";
import { AiOutlineEdit } from "react-icons/ai";
import { MdContentCopy } from "react-icons/md";
import { Link as ReactRouterLink } from "react-router-dom";

import { formatDate, download, formatNumber, getMetaKey } from "../../lib/utils";
import Markdown from "../Markdown";
import { useKeyDownHandler } from "../../hooks/use-key-down-handler";
import {
  ChatCraftHumanMessage,
  ChatCraftAiMessage,
  ChatCraftAiMessageVersion,
  ChatCraftMessage,
} from "../../lib/ChatCraftMessage";
import { ChatCraftModel } from "../../lib/ChatCraftModel";
import { useModels } from "../../hooks/use-models";
import { useSettings } from "../../hooks/use-settings";
import { useAlert } from "../../hooks/use-alert";

// Styles for the message text are defined in CSS vs. Chakra-UI
import "./Message.css";
import useMobileBreakpoint from "../../hooks/use-mobile-breakpoint";

export interface MessageBaseProps {
  message: ChatCraftMessage;
  chatId: string;
  editing: boolean;
  onEditingChange: (newValue: boolean) => void;
  summaryText?: string;
  heading?: string;
  headingMenu?: ReactNode;
  avatar: ReactNode;
  footer?: ReactNode;
  isLoading: boolean;
  hidePreviews?: boolean;
  onPrompt?: (prompt?: string) => void;
  onResubmitClick?: () => void;
  onDeleteBeforeClick?: () => void;
  onDeleteClick?: () => void;
  onDeleteAfterClick?: () => void;
  onRetryClick?: (model: ChatCraftModel) => void;
  disableFork?: boolean;
  disableEdit?: boolean;
}

function MessageBase({
  message,
  chatId,
  editing,
  onEditingChange,
  summaryText,
  heading,
  headingMenu,
  avatar,
  footer,
  isLoading,
  hidePreviews,
  onResubmitClick,
  onDeleteBeforeClick,
  onDeleteClick,
  onDeleteAfterClick,
  onPrompt,
  onRetryClick,
  disableFork,
  disableEdit,
}: MessageBaseProps) {
  const { id, date, text } = message;
  const { models } = useModels();
  const { onCopy } = useClipboard(text);
  const { info, error } = useAlert();
  const [isHovering, setIsHovering] = useState(false);
  const { settings } = useSettings();
  const [tokens, setTokens] = useState<number | null>(null);
  const isNarrowScreen = useMobileBreakpoint();
  const messageForm = useRef<HTMLFormElement>(null);
  const meta = useMemo(getMetaKey, []);
  const { isOpen, onToggle: originalOnToggle } = useDisclosure();
  const isLongMessage = text.length > 5000;
  const displaySummaryText = !isOpen && (summaryText || isLongMessage);
  const shouldShowDeleteMenu = Boolean(onDeleteBeforeClick || onDeleteClick || onDeleteAfterClick);

  // Wrap the onToggle function with startTransition, state update should be deferred due to long message
  // https://reactjs.org/docs/error-decoder.html?invariant=426
  const onToggle = () => {
    startTransition(() => {
      originalOnToggle();
    });
  };

  useEffect(() => {
    if (settings.countTokens) {
      message.tokens().then(setTokens).catch(console.warn);
    }
  }, [settings.countTokens, message]);

  const handleCopy = useCallback(() => {
    onCopy();
    info({
      title: "Copied to Clipboard",
      message: "Message text was copied to your clipboard.",
    });
  }, [onCopy, info]);

  const handleDownload = useCallback(() => {
    download(text, "message.md");
    info({
      title: "Downloaded",
      message: "Message was downloaded as a file",
    });
  }, [info, text]);

  const handleClick = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    messageForm.current?.setAttribute("data-action", e.currentTarget.name);
  }, []);

  const handleKeyDown = useKeyDownHandler<HTMLFormElement>({
    onEscape: () => {
      onEditingChange(false);
    },
    onMetaEnter() {
      const submitEvent = new Event("submit", { cancelable: true, bubbles: true });
      messageForm.current?.dispatchEvent(submitEvent);
    },
  });

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const action = messageForm.current?.getAttribute("data-action") || "save";

      const data = new FormData(e.currentTarget);
      const text = data.get("text");
      if (typeof text !== "string") {
        return;
      }

      // For AI messages, where we track versions, add this edited version.
      // to the list of all versions. For other message types, just update
      // the text of the message in place.
      const editedAt = new Date();
      if (message instanceof ChatCraftAiMessage) {
        const version = new ChatCraftAiMessageVersion({
          date: editedAt,
          text,
          model: message.model,
        });
        message.addVersion(version);
        message.switchVersion(version.id);
        message
          .save(chatId)
          .catch((err) => {
            console.warn("Unable to update message", err);
            error({
              title: `Error Updating Message`,
              message: err.message,
            });
          })
          .finally(() => {
            onEditingChange(false);
            messageForm.current?.removeAttribute("data-action");
          });
      } else {
        message.text = text;
        message.date = editedAt;
        message
          .save(chatId)
          .catch((err) => {
            console.warn("Unable to update message", err);
            error({
              title: `Error Updating Message`,
              message: err.message,
            });
          })
          .finally(() => {
            onEditingChange(false);
            if (action === "resubmit" && onResubmitClick) {
              onResubmitClick();
            }
            messageForm.current?.removeAttribute("data-action");
          });
      }
    },
    [message, onResubmitClick, chatId, error, onEditingChange]
  );

  return (
    <Box
      id={id}
      my={6}
      flex={1}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <Card>
        <CardHeader p={0} pt={3} pb={2} pr={1}>
          <Flex justify="space-between" align="center" ml={5} mr={2}>
            <Flex gap={3}>
              <Box>{avatar}</Box>
              <Flex direction="column" justify="center">
                <Flex h="100%" align="center" gap={2}>
                  <Heading as="h2" size="xs" minW="fit-content">
                    {heading}
                  </Heading>
                  <Text
                    as="span"
                    fontSize="sm"
                    minW="fit-content"
                    color="gray.500"
                    _dark={{ color: "gray.300" }}
                  >
                    <Link as={ReactRouterLink} to={`/c/${chatId}#${id}`}>
                      {formatDate(date, isNarrowScreen)}
                    </Link>
                  </Text>
                  {headingMenu}
                  {!isLoading && settings.countTokens && !!tokens && (
                    <Tag size="sm" variant="outline" colorScheme="gray">
                      {formatNumber(tokens)} Tokens
                    </Tag>
                  )}
                </Flex>
              </Flex>
            </Flex>

            <Flex align="center">
              {isHovering && (
                <ButtonGroup isAttached display={{ base: "none", md: "block" }}>
                  <IconButton
                    variant="ghost"
                    icon={<MdContentCopy />}
                    aria-label="Copy message to clipboard"
                    title="Copy message to clipboard"
                    onClick={() => handleCopy()}
                  />
                  {!disableEdit && !editing && (
                    <IconButton
                      variant="ghost"
                      icon={<AiOutlineEdit />}
                      aria-label="Edit message"
                      title="Edit message"
                      onClick={() => onEditingChange(!editing)}
                    />
                  )}
                  {onDeleteClick && (
                    <IconButton
                      variant="ghost"
                      icon={<TbTrash />}
                      aria-label="Delete message"
                      title="Delete message"
                      onClick={() => onDeleteClick()}
                    />
                  )}
                </ButtonGroup>
              )}
              <Menu isLoading={isLoading}>
                <MenuItem
                  label="Copy"
                  onClick={handleCopy}
                  icon={
                    <IconButton
                      variant="ghost"
                      icon={<MdContentCopy />}
                      aria-label="Copy message to clipboard"
                      title="Copy message to clipboard"
                    />
                  }
                />
                <MenuItem label="Download" onClick={handleDownload} />
                {!disableFork && (
                  <MenuItem
                    label={
                      <Link as={ReactRouterLink} to={`./fork/${id}`} target="_blank">
                        Duplicate Chat until Message...
                      </Link>
                    }
                  />
                )}
                {onRetryClick && (
                  <>
                    <MenuDivider />
                    <SubMenu label="Retry with...">
                      {models.map((model) => (
                        <MenuItem
                          key={model.id}
                          label={model.prettyModel}
                          onClick={() => onRetryClick(model)}
                        />
                      ))}
                    </SubMenu>
                  </>
                )}
                {(!disableEdit || onDeleteClick) && <MenuDivider />}
                {!disableEdit && (
                  <MenuItem
                    label={editing ? "Cancel Editing" : "Edit"}
                    onClick={() => onEditingChange(!editing)}
                    icon={
                      <IconButton
                        variant="ghost"
                        icon={<AiOutlineEdit />}
                        aria-label="Edit message"
                        title="Edit message"
                      />
                    }
                  />
                )}

                {shouldShowDeleteMenu && (
                  <SubMenu label="Delete" className="delete-button">
                    {onDeleteBeforeClick && (
                      <MenuItem
                        label="Delete Messages Before"
                        onClick={onDeleteBeforeClick}
                        className="delete-button"
                      />
                    )}
                    {onDeleteClick && (
                      <MenuItem
                        label="Delete Message"
                        onClick={onDeleteClick}
                        className="delete-button"
                        icon={
                          <IconButton
                            variant="ghost"
                            icon={<TbTrash />}
                            aria-label="Delete message"
                            title="Delete message"
                          />
                        }
                      />
                    )}
                    {onDeleteAfterClick && (
                      <MenuItem
                        label="Delete Messages After"
                        onClick={onDeleteAfterClick}
                        className="delete-button"
                      />
                    )}
                  </SubMenu>
                )}
              </Menu>
            </Flex>
          </Flex>
        </CardHeader>
        <CardBody p={0}>
          <Flex direction="column" gap={3}>
            <Box maxWidth="100%" minH="2em" overflow="hidden" px={6} pb={2}>
              {
                // only display the button before message if the message is too long and toggled
                !editing && isLongMessage && isOpen ? (
                  <Button size="sm" variant="ghost" onClick={() => onToggle()}>
                    {"Show Less"}
                  </Button>
                ) : undefined
              }
              {editing ? (
                // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
                <form onSubmit={handleSubmit} ref={messageForm} onKeyDown={handleKeyDown}>
                  <VStack align="end">
                    <Textarea
                      as={ResizeTextarea}
                      name="text"
                      minH="unset"
                      overflowY="scroll"
                      w="100%"
                      maxH="30vh"
                      resize="vertical"
                      minRows={1}
                      defaultValue={text}
                      autoFocus={true}
                    />
                    <Flex width="100%" alignItems="center" alignContent="end" gap={2}>
                      <Spacer />
                      {!isNarrowScreen && (
                        <Text fontSize="sm" color="gray">
                          <span>
                            <Kbd>{meta}</Kbd> + <Kbd>Enter</Kbd>
                            <span> to save</span>
                          </span>
                        </Text>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => onEditingChange(false)}>
                        Cancel
                      </Button>
                      <ButtonGroup>
                        {message instanceof ChatCraftHumanMessage && (
                          <Button
                            size="sm"
                            variant="outline"
                            type="submit"
                            name="resubmit"
                            onClick={handleClick}
                          >
                            Re-Ask
                          </Button>
                        )}
                        <Button size="sm" type="submit" name="save" onClick={handleClick}>
                          Save
                        </Button>
                      </ButtonGroup>
                    </Flex>
                  </VStack>
                </form>
              ) : (
                <>
                  <Markdown
                    previewCode={!hidePreviews && !displaySummaryText}
                    isLoading={isLoading}
                    onPrompt={onPrompt}
                    className={displaySummaryText ? "message-text message-text-blur" : undefined}
                  >
                    {displaySummaryText ? summaryText || text.slice(0, 500).trim() : text}
                  </Markdown>
                  {isLongMessage ? (
                    <Button zIndex={10} size="sm" variant="ghost" onClick={() => onToggle()}>
                      {isOpen ? "Show Less" : "Show More..."}
                    </Button>
                  ) : undefined}
                </>
              )}
            </Box>
          </Flex>
        </CardBody>
        {footer && <CardFooter py={2}>{footer}</CardFooter>}
      </Card>
    </Box>
  );
}

export default memo(MessageBase);
