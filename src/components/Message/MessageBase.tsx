import { memo, useCallback, type ReactNode, useState, FormEvent } from "react";
import {
  Box,
  Button,
  ButtonGroup,
  Card,
  CardBody,
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
  Text,
  Textarea,
  VStack,
  useClipboard,
  useToast,
} from "@chakra-ui/react";
import ResizeTextarea from "react-textarea-autosize";
import { TbDots } from "react-icons/tb";
import { Link as ReactRouterLink, useNavigate } from "react-router-dom";

import { formatDate, download } from "../../lib/utils";
import Markdown from "../Markdown";
import {
  ChatCraftAiMessage,
  ChatCraftAiMessageVersion,
  ChatCraftMessage,
} from "../../lib/ChatCraftMessage";
import { useModels } from "../../hooks/use-models";
import { ChatCraftModel } from "../../lib/ChatCraftModel";

// Styles for the message text are defined in CSS vs. Chakra-UI
import "./Message.css";

export interface MessageBaseProps {
  message: ChatCraftMessage;
  chatId: string;
  heading?: string;
  headingMenu?: ReactNode;
  avatar: ReactNode;
  isLoading: boolean;
  hidePreviews?: boolean;
  onPrompt?: (prompt: string) => void;
  onDeleteClick?: () => void;
  onRetryClick?: (model: ChatCraftModel) => void;
  disableFork?: boolean;
  disableEdit?: boolean;
}

function MessageBase({
  message,
  chatId,
  heading,
  headingMenu,
  avatar,
  isLoading,
  hidePreviews,
  onDeleteClick,
  onPrompt,
  onRetryClick,
  disableFork,
  disableEdit,
}: MessageBaseProps) {
  const { id, date, text } = message;
  const { models } = useModels();
  const [editing, setEditing] = useState(false);
  const { onCopy } = useClipboard(text);
  const toast = useToast();
  const navigate = useNavigate();

  const handleCopy = useCallback(() => {
    onCopy();
    toast({
      title: "Copied to Clipboard",
      description: "Message text was copied to your clipboard.",
      status: "info",
      duration: 3000,
      position: "top",
      isClosable: true,
    });
  }, [onCopy, toast]);

  const handleDownload = useCallback(() => {
    download(text, "message.md");
    toast({
      title: "Downloaded",
      description: "Message was downloaded as a file",
      status: "info",
      duration: 3000,
      position: "top",
      isClosable: true,
    });
  }, [toast, text]);

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      const data = new FormData(e.target as HTMLFormElement);
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
            toast({
              title: `Error Updating Message`,
              description: "message" in err ? err.message : undefined,
              status: "error",
              position: "top",
              isClosable: true,
            });
          })
          .finally(() => setEditing(false));
      } else {
        message.text = text;
        message.date = editedAt;
        message
          .save(chatId)
          .catch((err) => {
            console.warn("Unable to update message", err);
            toast({
              title: `Error Updating Message`,
              description: "message" in err ? err.message : undefined,
              status: "error",
              position: "top",
              isClosable: true,
            });
          })
          .finally(() => setEditing(false));
      }
    },
    [message, toast, chatId]
  );

  return (
    <Box id={id} my={6} flex={1}>
      <Card>
        <CardHeader p={0} py={1} pr={1}>
          <Flex justify="space-between" align="center" ml={5} mr={2}>
            <Flex gap={3}>
              <Box>{avatar}</Box>
              <Flex direction="column" justify="center">
                <Flex h="100%" align="center" gap={2}>
                  <Heading as="h2" size="xs" minW="fit-content">
                    {heading}
                  </Heading>
                  <Text as="span" fontSize="sm" minW="fit-content">
                    <Link
                      as={ReactRouterLink}
                      to={`/c/${chatId}#${id}`}
                      color="gray.500"
                      _dark={{ color: "gray.300" }}
                    >
                      {formatDate(date)}
                    </Link>
                  </Text>
                  {headingMenu}
                </Flex>
              </Flex>
            </Flex>

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
                  <MenuItem onClick={() => navigate(`./fork/${id}`)}>
                    Duplicate Chat from Message...
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

                {!disableEdit && onDeleteClick && <MenuDivider />}
                {!disableEdit && (
                  <MenuItem onClick={() => setEditing(!editing)}>
                    {editing ? "Cancel Editing" : "Edit"}
                  </MenuItem>
                )}
                {onDeleteClick && (
                  <MenuItem onClick={() => onDeleteClick()} color="red.400">
                    Delete
                  </MenuItem>
                )}
              </MenuList>
            </Menu>
          </Flex>
        </CardHeader>
        <CardBody p={0}>
          <Flex direction="column" gap={3}>
            <Box maxWidth="100%" minH="2em" overflow="hidden" px={6} pb={2}>
              {editing ? (
                <form onSubmit={handleSubmit}>
                  <VStack align="end">
                    <Textarea
                      as={ResizeTextarea}
                      name="text"
                      minH="unset"
                      overflow="hidden"
                      w="100%"
                      maxH="30vh"
                      resize="vertical"
                      minRows={1}
                      defaultValue={text}
                      autoFocus={true}
                    />
                    <ButtonGroup>
                      <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" type="submit">
                        Save
                      </Button>
                    </ButtonGroup>
                  </VStack>
                </form>
              ) : (
                <Markdown previewCode={!hidePreviews} isLoading={isLoading} onPrompt={onPrompt}>
                  {text}
                </Markdown>
              )}
            </Box>
          </Flex>
        </CardBody>
      </Card>
    </Box>
  );
}

export default memo(MessageBase);
