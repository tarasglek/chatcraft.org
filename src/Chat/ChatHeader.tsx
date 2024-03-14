import { FormEvent, useEffect, useState } from "react";
import {
  Box,
  Button,
  ButtonGroup,
  Card,
  CardBody,
  CardFooter,
  Flex,
  IconButton,
  Input,
  Link,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Tag,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { Link as ReactRouterLink, useFetcher } from "react-router-dom";
import { MdOutlineChatBubbleOutline } from "react-icons/md";
import { TbDots } from "react-icons/tb";
import { AiOutlineEdit } from "react-icons/ai";
import { useCopyToClipboard, useKey } from "react-use";

import { ChatCraftChat } from "../lib/ChatCraftChat";
import { download, formatCurrency, formatDate, formatNumber } from "../lib/utils";
import ShareModal from "../components/ShareModal";
import { useSettings } from "../hooks/use-settings";
import useTitle from "../hooks/use-title";
import { useAlert } from "../hooks/use-alert";
import { useCost } from "../hooks/use-cost";

type ChatHeaderProps = {
  chat: ChatCraftChat;
};

function ChatHeader({ chat }: ChatHeaderProps) {
  const [, copyToClipboard] = useCopyToClipboard();
  const { info, error } = useAlert();
  const fetcher = useFetcher();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [tokens, setTokens] = useState<number | null>(null);
  const { cost } = useCost();
  const [isEditing, setIsEditing] = useState(false);
  const { settings } = useSettings();
  const title = useTitle(chat);

  useKey("Escape", () => setIsEditing(false), { event: "keydown" }, [setIsEditing]);

  useEffect(() => {
    setIsEditing(false);
  }, [chat.id]);

  useEffect(() => {
    if (settings.countTokens) {
      chat.tokens().then(setTokens).catch(console.warn);
    }
  }, [settings.countTokens, chat]);

  const handleCopyChatClick = () => {
    const text = chat.toMarkdown();
    copyToClipboard(text);
    info({
      title: "Chat copied to clipboard",
    });
  };

  const handleDownloadClick = () => {
    const text = chat.toMarkdown();
    download(text, "chat.md", "text/markdown");
    info({
      title: "Chat downloaded as Markdown",
    });
  };

  const handleDeleteClick = () => {
    fetcher.submit({}, { method: "post", action: `/c/${chat.id}/delete` });
  };

  const handleSaveSummary = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const data = new FormData(e.target as HTMLFormElement);
    const summary = data.get("summary");
    if (typeof summary !== "string") {
      return;
    }

    chat.summary = summary;
    chat
      .save()
      .catch((err) => {
        console.warn("Unable to update summary for chat", err);
        error({
          title: `Error Updating Chat`,
          message: err.message,
        });
      })
      .finally(() => setIsEditing(false));
  };

  return (
    <>
      <Card
        variant="filled"
        bg="gray.200"
        size="sm"
        border="1px solid"
        borderColor="gray.300"
        _dark={{
          bg: "gray.800",
          borderColor: "gray.900",
        }}
        mt={2}
      >
        <CardBody pb={0}>
          <Flex justify="space-between" align="center">
            <Box w="100%">
              {isEditing ? (
                <form onSubmit={handleSaveSummary}>
                  <Flex align="center" gap={2}>
                    <Input
                      flex={1}
                      defaultValue={chat.summary}
                      type="text"
                      name="summary"
                      bg="white"
                      _dark={{ bg: "gray.700" }}
                      size="sm"
                      w="100%"
                      autoFocus={true}
                      placeholder="Chat Summary"
                    />
                    <ButtonGroup>
                      <Button variant="outline" size="xs" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                      <Button size="xs" type="submit">
                        Save
                      </Button>
                    </ButtonGroup>
                  </Flex>
                </form>
              ) : (
                <Flex align="center" gap={2} maxW="100%">
                  <Box>
                    <MdOutlineChatBubbleOutline />
                  </Box>
                  <Text fontSize="md" fontWeight="bold" noOfLines={1} title={title}>
                    <Link as={ReactRouterLink} to={`/c/${chat.id}`}>
                      {title}
                    </Link>
                  </Text>
                  {settings.currentProvider.apiKey && (
                    <IconButton
                      variant="ghost"
                      size="sm"
                      icon={<AiOutlineEdit />}
                      aria-label="Edit summary"
                      title="Edit summary"
                      onClick={() => setIsEditing(true)}
                    />
                  )}
                </Flex>
              )}
            </Box>

            <Menu>
              <MenuButton
                as={IconButton}
                aria-label="Chat Menu"
                icon={<TbDots />}
                variant="ghost"
              />
              <MenuList>
                <MenuItem onClick={() => handleCopyChatClick()}>Copy</MenuItem>
                <MenuItem onClick={() => handleDownloadClick()}>Download</MenuItem>

                {!chat.readonly && settings.currentProvider.apiKey && (
                  <>
                    <MenuDivider />
                    <MenuItem onClick={onOpen}>Share Chat...</MenuItem>

                    <MenuDivider />
                    <MenuItem color="red.400" onClick={() => handleDeleteClick()}>
                      Delete
                    </MenuItem>
                  </>
                )}
              </MenuList>
            </Menu>
          </Flex>
        </CardBody>
        <CardFooter pt={0}>
          <Flex w="100%" gap={4} color="gray.500" _dark={{ color: "gray.400" }}>
            <Link as={ReactRouterLink} to={`/c/${chat.id}`}>
              <Text fontSize="sm" ml={6}>
                {formatDate(chat.date)}
              </Text>
            </Link>
            {settings.countTokens && tokens && (
              <Flex gap={2}>
                <Tag size="sm" variant="outline" colorScheme="gray">
                  {formatNumber(tokens)} Tokens
                </Tag>
                <Tag key="token-cost" size="sm" variant="outline" colorScheme="gray">
                  {formatCurrency(cost)}
                </Tag>
              </Flex>
            )}
          </Flex>
        </CardFooter>
      </Card>

      <ShareModal chat={chat} isOpen={isOpen} onClose={onClose} />
    </>
  );
}

export default ChatHeader;
