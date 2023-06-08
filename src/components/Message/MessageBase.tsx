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

import db from "../../lib/db";
import { formatDate, download } from "../../lib/utils";
import Markdown from "../Markdown";
import { ChatCraftMessage } from "../../lib/ChatCraftMessage";

// Styles for the message text are defined in CSS vs. Chakra-UI
import "./Message.css";

export interface MessageBaseProps {
  message: ChatCraftMessage;
  chatId: string;
  heading?: string;
  avatar: ReactNode;
  isLoading: boolean;
  hidePreviews?: boolean;
  onPrompt?: (prompt: string) => void;
  onDeleteClick?: () => void;
  onRetryClick?: (model: GptModel) => void;
  disableFork?: boolean;
  disableEdit?: boolean;
}

function MessageBase({
  message,
  chatId,
  heading,
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
      if (typeof text === "string") {
        db.messages
          .update(message.id, { text, date: new Date() })
          // TODO: UI for error..
          .catch((err) => console.warn("Unable to update message", err))
          .finally(() => setEditing(false));
      }
    },
    [message]
  );

  return (
    <Box id={id} my={6} flex={1}>
      <Card>
        <CardHeader p={0} py={1} pr={1}>
          <Flex justify="space-between" align="center" ml={5} mr={2}>
            <Flex gap={3}>
              <Box>{avatar}</Box>
              <Flex direction="column" justify="center">
                <Flex h="100%" align="center" gap={3}>
                  <Heading as="h2" size="xs">
                    {heading}
                  </Heading>
                  <Text as="span" fontSize="sm">
                    <Link
                      as={ReactRouterLink}
                      to={`/c/${chatId}#${id}`}
                      color="gray.500"
                      _dark={{ color: "gray.300" }}
                    >
                      {formatDate(date)}
                    </Link>
                  </Text>
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

                {onRetryClick && <MenuDivider />}
                {onRetryClick && (
                  <MenuItem onClick={() => onRetryClick("gpt-3.5-turbo")}>
                    Retry with GPT 3.5
                  </MenuItem>
                )}
                {onRetryClick && (
                  <MenuItem onClick={() => onRetryClick("gpt-4")}>Retry with GPT 4</MenuItem>
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
