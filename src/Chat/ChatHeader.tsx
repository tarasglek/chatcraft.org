import {
  Card,
  CardBody,
  Flex,
  Heading,
  IconButton,
  Link,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { Link as ReactRouterLink, useFetcher } from "react-router-dom";
import { MdOutlineChatBubbleOutline } from "react-icons/md";
import { TbDots } from "react-icons/tb";
import { useCopyToClipboard } from "react-use";

import { ChatCraftChat } from "../lib/ChatCraftChat";
import { download, formatDate } from "../lib/utils";
import { useUser } from "../hooks/use-user";
import ShareModal from "../components/ShareModal";

type ChatHeaderProps = {
  chat: ChatCraftChat;
};

function ChatHeader({ chat }: ChatHeaderProps) {
  const { user } = useUser();
  const [, copyToClipboard] = useCopyToClipboard();
  const toast = useToast();
  const fetcher = useFetcher();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleCopyChatClick = () => {
    const text = chat.toMarkdown();
    copyToClipboard(text);
    toast({
      colorScheme: "blue",
      title: "Chat copied to clipboard",
      status: "success",
      position: "top",
      isClosable: true,
    });
  };

  const handleCopyPublicUrlClick = () => {
    if (!chat.shareUrl) {
      console.warn("Unexpected copy of missing shareUrl", chat);
      return;
    }

    copyToClipboard(chat.shareUrl);
    toast({
      colorScheme: "blue",
      title: "Chat copied to clipboard",
      status: "success",
      position: "top",
      isClosable: true,
    });
  };

  const handleDownloadClick = () => {
    const text = chat.toMarkdown();
    download(text, "chat.md", "text/markdown");
    toast({
      colorScheme: "blue",
      title: "Chat downloaded as Markdown",
      status: "success",
      position: "top",
      isClosable: true,
    });
  };

  const handleDeleteClick = () => {
    fetcher.submit({}, { method: "post", action: `/c/${chat.id}/delete` });
  };

  return (
    <>
      <Card
        variant="filled"
        bg="gray.100"
        size="sm"
        border="1px solid"
        borderColor="gray.200"
        _dark={{
          bg: "gray.800",
          borderColor: "gray.900",
        }}
        mt={2}
      >
        <CardBody>
          <Flex justify="space-between" align="center">
            <Heading as="h2" fontSize="md">
              <Link as={ReactRouterLink} to={`/c/${chat.id}`}>
                <Flex align="center" gap={2}>
                  <MdOutlineChatBubbleOutline />
                  {formatDate(chat.date)}
                </Flex>
              </Link>
            </Heading>

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
                <MenuDivider />

                {chat.shareUrl && user ? (
                  <>
                    <MenuItem onClick={() => handleCopyPublicUrlClick()}>Copy Public URL</MenuItem>
                    <MenuItem onClick={() => chat.unshare(user)}>Unshare</MenuItem>
                  </>
                ) : (
                  <MenuItem onClick={onOpen}>Create Public URL...</MenuItem>
                )}

                {!chat.readonly && (
                  <>
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
      </Card>

      <ShareModal chat={chat} isOpen={isOpen} onClose={onClose} />
    </>
  );
}

export default ChatHeader;
