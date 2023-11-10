import {
  memo,
  useCallback,
  useState,
  useEffect,
  useRef,
  type ReactNode,
  type MouseEvent,
  type FormEvent,
  type KeyboardEvent,
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
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Tag,
  Text,
  Textarea,
  VStack,
  useClipboard,
} from "@chakra-ui/react";
import ResizeTextarea from "react-textarea-autosize";
import { TbDots, TbTrash } from "react-icons/tb";
import { AiOutlineEdit } from "react-icons/ai";
import { MdContentCopy } from "react-icons/md";
import { Link as ReactRouterLink } from "react-router-dom";

import { formatDate, download, formatNumber } from "../../lib/utils";
import Markdown from "../Markdown";
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

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === "Enter" || e.key === "NumpadEnter")) {
        const submitEvent = new Event("submit", { cancelable: true, bubbles: true });
        messageForm.current?.dispatchEvent(submitEvent);
      }
      if (e.key === "Escape") {
        onEditingChange(false);
      }
    },
    [onEditingChange]
  );

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const action = e.currentTarget.getAttribute("data-action") || "save";

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
            e.currentTarget.removeAttribute("data-action");
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
            e.currentTarget.removeAttribute("data-action");
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
              <Menu>
                <MenuButton
                  as={IconButton}
                  aria-label="Message Menu"
                  icon={<TbDots />}
                  variant="ghost"
                  isDisabled={isLoading}
                />
                <MenuList>
                  <MenuItem onClick={() => handleCopy()}>Copy</MenuItem>
                  <MenuItem onClick={() => handleDownload()}>Download</MenuItem>
                  {!disableFork && (
                    <MenuItem as={ReactRouterLink} to={`./fork/${id}`} target="_blank">
                      Duplicate Chat until Message...
                    </MenuItem>
                  )}

                  {onRetryClick && (
                    <>
                      <MenuDivider />
                      {models.map((model) => (
                        <MenuItem key={model.id} onClick={() => onRetryClick(model)}>
                          Retry with {model.prettyModel}
                        </MenuItem>
                      ))}
                    </>
                  )}

                  {(!disableEdit || onDeleteClick) && <MenuDivider />}
                  {!disableEdit && (
                    <MenuItem onClick={() => onEditingChange(!editing)}>
                      {editing ? "Cancel Editing" : "Edit"}
                    </MenuItem>
                  )}
                  {onDeleteBeforeClick && (
                    <MenuItem onClick={() => onDeleteBeforeClick()} color="red.400">
                      Delete Messages Before
                    </MenuItem>
                  )}
                  {onDeleteClick && (
                    <MenuItem onClick={() => onDeleteClick()} color="red.400">
                      Delete Message
                    </MenuItem>
                  )}
                  {onDeleteAfterClick && (
                    <MenuItem onClick={() => onDeleteAfterClick()} color="red.400">
                      Delete Messages After
                    </MenuItem>
                  )}
                </MenuList>
              </Menu>
            </Flex>
          </Flex>
        </CardHeader>
        <CardBody p={0}>
          <Flex direction="column" gap={3}>
            <Box maxWidth="100%" minH="2em" overflow="hidden" px={6} pb={2}>
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
                    <ButtonGroup>
                      <Button size="sm" variant="outline" onClick={() => onEditingChange(false)}>
                        Cancel
                      </Button>
                      {message instanceof ChatCraftHumanMessage && (
                        <Button
                          size="sm"
                          type="submit"
                          name="resubmit"
                          colorScheme="teal"
                          onClick={handleClick}
                        >
                          Save & Submit
                        </Button>
                      )}
                      <Button size="sm" type="submit" name="save" onClick={handleClick}>
                        Save
                      </Button>
                    </ButtonGroup>
                  </VStack>
                </form>
              ) : (
                <Markdown previewCode={!hidePreviews} isLoading={isLoading} onPrompt={onPrompt}>
                  {summaryText || text}
                </Markdown>
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
