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
  Image,
  Kbd,
  Link,
  Spacer,
  Tag,
  Text,
  Textarea,
  VStack,
  useClipboard,
  useDisclosure,
} from "@chakra-ui/react";
import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

import { AiOutlineEdit } from "react-icons/ai";
import { MdContentCopy } from "react-icons/md";
import { TbShare2, TbTrash, TbDownload } from "react-icons/tb";
import { Link as ReactRouterLink } from "react-router-dom";
import ResizeTextarea from "react-textarea-autosize";
import { Menu, MenuDivider, MenuItem, MenuItemLink, SubMenu } from "../Menu";

import { useCopyToClipboard } from "react-use";
import { useAlert } from "../../hooks/use-alert";
import { useKeyDownHandler } from "../../hooks/use-key-down-handler";
import { useModels } from "../../hooks/use-models";
import { useSettings } from "../../hooks/use-settings";
import {
  ChatCraftAiMessage,
  ChatCraftAiMessageVersion,
  ChatCraftHumanMessage,
  ChatCraftMessage,
  ChatCraftSystemMessage,
} from "../../lib/ChatCraftMessage";
import { ChatCraftModel } from "../../lib/ChatCraftModel";
import {
  download,
  formatDate,
  formatNumber,
  getMetaKey,
  screenshotElement,
  utilizeAlert,
} from "../../lib/utils";
import ImageModal from "../ImageModal";
import Markdown from "../Markdown";

// Styles for the message text are defined in CSS vs. Chakra-UI
import { useLiveQuery } from "dexie-react-hooks";
import useAudioPlayer from "../../hooks/use-audio-player";
import useMobileBreakpoint from "../../hooks/use-mobile-breakpoint";
import { useUser } from "../../hooks/use-user";
import { ChatCraftChat } from "../../lib/ChatCraftChat";
import { textToSpeech } from "../../lib/ai";
import { usingOfficialOpenAI } from "../../lib/providers";
import { getSentenceChunksFrom } from "../../lib/summarize";
import "./Message.css";

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
  onResubmitClick?: (promptText?: string) => void;
  onDeleteBeforeClick?: () => void;
  onDeleteClick?: () => void;
  onDeleteAfterClick?: () => void;
  onRetryClick?: (model: ChatCraftModel) => void;
  hasMessagesAfter?: boolean;
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
  hasMessagesAfter,
  disableFork,
  disableEdit,
}: MessageBaseProps) {
  const [, copyToClipboard] = useCopyToClipboard();
  const { id, date, text, imageUrls } = message;
  const { models } = useModels();
  const isTtsSupported = useMemo(() => {
    return !!models.filter((model) => model.id.includes("tts"))?.length;
  }, [models]);
  const { onCopy } = useClipboard(text);
  const { info, error } = useAlert();
  const [isHovering, setIsHovering] = useState(false);
  const { settings } = useSettings();
  const [tokens, setTokens] = useState<number | null>(null);
  const isNarrowScreen = useMobileBreakpoint();
  const messageForm = useRef<HTMLFormElement>(null);
  const messageContent = useRef<HTMLDivElement>(null);
  const meta = useMemo(getMetaKey, []);
  const [imageModalOpen, setImageModalOpen] = useState<boolean>(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const { isOpen, onToggle: originalOnToggle } = useDisclosure();
  const isSystemMessage = message instanceof ChatCraftSystemMessage;
  const isLongMessage =
    text.length > 5000 || (isSystemMessage && summaryText && text.length > summaryText.length);
  const displaySummaryText = !isOpen && (summaryText || isLongMessage);
  const shouldShowDeleteMenu =
    Boolean(onDeleteBeforeClick || onDeleteClick || onDeleteAfterClick) && !disableEdit;
  const chat = useLiveQuery(() => ChatCraftChat.find(chatId), [chatId]);
  const { user } = useUser();
  const handleShareMessage = useCallback(async () => {
    if (!user) {
      error({
        title: "Failed to Share Message",
        message: "Can't share message because user is not logged in",
      });
      return;
    }
    if (!chat) {
      console.error("Chat not found");
      return;
    }
    try {
      // Use the shareSingleMessage method from the chat instance
      const { url } = await chat.shareSingleMessage(user, message.id);
      info({
        title: "Message Shared Successfully",
        message: `URL has been copied to clipboard`,
      });
      copyToClipboard(url);
    } catch (err) {
      console.error(err);
      error({
        title: "Failed to Share Message",
        message: "An error occurred while trying to share the message.",
      });
    }
  }, [message.id, user, chat, info, error, copyToClipboard]);

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

  // If last message is collapsed, auto expand for better view
  useEffect(() => {
    if (!hasMessagesAfter && !isOpen && !(message instanceof ChatCraftSystemMessage)) {
      onToggle();
    }

    // ignore isOpen as onToggle() will change isOpen status
    // ignore message as each message has its corresponding hasMessagesAfter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMessagesAfter]);

  const handleCopy = useCallback(() => {
    onCopy();
    info({
      title: "Copied to Clipboard",
      message: "Message text was copied to your clipboard.",
    });
  }, [onCopy, info]);

  const handleDownloadMarkdown = useCallback(() => {
    download(text, "message.md", "text/markdown");
    info({
      title: "Downloaded",
      message: "Message was downloaded as a Markdown file",
    });
  }, [info, text]);

  const handleDownloadImage = useCallback(() => {
    const elem = messageContent.current;
    if (!elem) {
      return;
    }

    try {
      screenshotElement(elem).then((blob) => {
        download(blob, "message.png", "image/png");
        info({
          title: "Downloaded",
          message: "Message was downloaded as an image file",
        });
      });
    } catch (err: any) {
      console.warn("Unable to download image", err);
      error({
        title: `Error Saving Message as Image`,
        message: err.message,
      });
    }
  }, [messageContent, info, error]);

  const handleDownloadPlainText = useCallback(() => {
    if (messageContent.current) {
      const text = messageContent.current.textContent;
      if (text) {
        download(text, "message.txt", "text/plain");
        info({
          title: "Downloaded",
          message: "Message was downloaded as text file",
        });
      }
    }
  }, [messageContent, info]);

  const handleDownloadAudio = useCallback(async () => {
    if (messageContent.current) {
      const text = messageContent.current.textContent;
      if (text) {
        const { loading, closeLoading } = await utilizeAlert();

        const alertId = loading({
          title: "Downloading...",
          message: "Please wait while we prepare your audio download.",
        });

        try {
          const textChunks = getSentenceChunksFrom(text, 500);
          const audioClips: Blob[] = new Array<Blob>(textChunks.length);

          // Limit the number of concurrent tasks
          const pLimit = (await import("p-limit")).default;

          const limit = pLimit(8); // Adjust the concurrency limit as needed

          const tasks = textChunks.map((textChunk, index) => {
            return limit(async () => {
              const audioClipUrl = await textToSpeech(
                textChunk,
                settings.textToSpeech.voice,
                "tts-1-hd"
              );

              const audioClip = await fetch(audioClipUrl).then((r) => r.blob());
              audioClips[index] = audioClip;
            });
          });

          // Wait for all the tasks to complete
          await Promise.all(tasks);

          const audioClip = new Blob(audioClips, { type: audioClips[0].type });

          download(
            audioClip,
            `${settings.currentProvider.name}_message.${audioClip.type.split("/")[1]}`,
            audioClip.type
          );

          closeLoading(alertId);
          info({
            title: "Downloaded",
            message: "Message was downloaded as Audio",
          });
        } catch (err: any) {
          console.error(err);

          closeLoading(alertId);
          error({ title: "Error while downloading audio", message: err.message });
        }
      }
    }
  }, [error, info, settings.currentProvider.name, settings.textToSpeech.voice]);

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
              onResubmitClick(text);
            }
            messageForm.current?.removeAttribute("data-action");
          });
      }
    },
    [message, onResubmitClick, chatId, error, onEditingChange]
  );

  const openModalWithImage = (imageSrc: string) => {
    setSelectedImage(imageSrc);
    setImageModalOpen(true);
  };
  const closeModal = () => setImageModalOpen(false);

  const { clearAudioQueue, addToAudioQueue } = useAudioPlayer();

  const handleSpeakMessage = useCallback(
    async (messageContent: string) => {
      try {
        // Stop any currently playing audio before starting new
        clearAudioQueue();

        const { voice } = settings.textToSpeech;

        const messageChunks = getSentenceChunksFrom(messageContent, 500);

        messageChunks.forEach((messageChunk) => {
          // Use lighter tts-1 model to minimize latency
          addToAudioQueue(textToSpeech(messageChunk, voice, "tts-1"));
        });
      } catch (err: any) {
        console.error(err);
        error({ title: "Error while generating Audio", message: err.message });
      }
    },
    [clearAudioQueue, settings.textToSpeech, addToAudioQueue, error]
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
                  {!disableEdit && onDeleteClick && (
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
              <Menu align="end" isDisabled={isLoading}>
                <MenuItem onClick={handleCopy} icon={<MdContentCopy />}>
                  Copy
                </MenuItem>
                <SubMenu label="Export" icon={<TbDownload />}>
                  <MenuItem onClick={handleDownloadMarkdown}>Export as Markdown</MenuItem>
                  <MenuItem onClick={handleDownloadPlainText}>Export as Text</MenuItem>
                  {isTtsSupported && (
                    <MenuItem onClick={handleDownloadAudio}>Export as Audio</MenuItem>
                  )}
                  <MenuItem
                    onClick={handleDownloadImage}
                    isDisabled={displaySummaryText !== false || editing}
                  >
                    Export as Image
                  </MenuItem>
                </SubMenu>
                {isTtsSupported && (
                  <MenuItem
                    onClick={() => handleSpeakMessage(messageContent.current?.textContent ?? "")}
                  >
                    Speak
                  </MenuItem>
                )}
                {!disableFork && (
                  <MenuItemLink to={`./fork/${id}`} target="_blank">
                    Duplicate Chat until Message...
                  </MenuItemLink>
                )}
                {onRetryClick && (
                  <>
                    <MenuDivider />
                    <SubMenu label="Retry with...">
                      {models
                        .filter((model) => !usingOfficialOpenAI() || model.id.includes("gpt"))
                        .map((model) => (
                          <MenuItem key={model.id} onClick={() => onRetryClick(model)}>
                            {model.prettyModel}
                          </MenuItem>
                        ))}
                    </SubMenu>
                  </>
                )}
                <MenuDivider />
                <MenuItem onClick={() => handleShareMessage()} icon={<TbShare2 />}>
                  Share Message
                </MenuItem>
                {(!disableEdit || shouldShowDeleteMenu) && <MenuDivider />}
                {!disableEdit && (
                  <MenuItem onClick={() => onEditingChange(!editing)} icon={<AiOutlineEdit />}>
                    {editing ? "Cancel Editing" : "Edit"}
                  </MenuItem>
                )}
                {shouldShowDeleteMenu && (
                  <>
                    {onDeleteClick && !onDeleteBeforeClick && !onDeleteAfterClick ? (
                      <MenuItem onClick={onDeleteClick} color="red.400" icon={<TbTrash />}>
                        Delete Message
                      </MenuItem>
                    ) : (
                      <SubMenu label="Delete" color="red.400" icon={<TbTrash />}>
                        {onDeleteBeforeClick && (
                          <MenuItem onClick={onDeleteBeforeClick} color="red.400">
                            Delete Messages Before
                          </MenuItem>
                        )}
                        {onDeleteClick && (
                          <MenuItem color="red.400" onClick={onDeleteClick}>
                            Delete Message
                          </MenuItem>
                        )}
                        {onDeleteAfterClick && (
                          <MenuItem onClick={onDeleteAfterClick} color="red.400">
                            Delete Messages After
                          </MenuItem>
                        )}
                      </SubMenu>
                    )}
                  </>
                )}
              </Menu>
            </Flex>
          </Flex>
        </CardHeader>
        <CardBody p={0}>
          <Flex direction="column" gap={3}>
            <Box
              maxWidth="100%"
              minH="2em"
              overflow="hidden"
              // Offset for the extra pixel of padding added to the messageContent box below
              m={-1}
              px={6}
              pb={2}
            >
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
                <Box
                  ref={messageContent}
                  // Add a single pixel of offset for rendering to canvas (offset handled above with m=-1)
                  p={1}
                >
                  {imageUrls.map((imageUrl, index) => (
                    <Box key={`${id}-${index}`}>
                      <Image
                        src={imageUrl}
                        alt={`Images# ${index}`}
                        margin={"auto"}
                        maxWidth={"100%"}
                        cursor={"pointer"}
                        onClick={() => openModalWithImage(imageUrl)}
                      />
                    </Box>
                  ))}
                  <Markdown
                    previewCode={!hidePreviews && !displaySummaryText}
                    isLoading={isLoading}
                    onPrompt={onPrompt}
                    className={displaySummaryText ? "message-text message-text-blur" : undefined}
                  >
                    {displaySummaryText ? summaryText || text.slice(0, 500).trim() : text}
                  </Markdown>
                  <Flex w="100%" justify="space-between" align="center">
                    <Button
                      hidden={!isLongMessage || editing}
                      zIndex={10}
                      size="sm"
                      variant="ghost"
                      onClick={() => onToggle()}
                    >
                      {isOpen ? "Show Less" : "Show More..."}
                    </Button>
                    <Button
                      hidden={!!disableEdit || !isSystemMessage}
                      size="sm"
                      variant="ghost"
                      ml="auto"
                      onClick={() => onEditingChange(true)}
                    >
                      <Text fontSize="xs" as="em">
                        Edit to customize
                      </Text>
                    </Button>
                  </Flex>
                </Box>
              )}
            </Box>
            <ImageModal isOpen={imageModalOpen} onClose={closeModal} imageSrc={selectedImage} />
          </Flex>
        </CardBody>
        {footer && <CardFooter py={2}>{footer}</CardFooter>}
      </Card>
    </Box>
  );
}

export default memo(MessageBase);
