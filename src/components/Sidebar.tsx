import { FormEvent, useEffect, useState } from "react";

import {
  Box,
  Flex,
  VStack,
  Heading,
  Tag,
  Text,
  Button,
  Center,
  useColorModeValue,
  IconButton,
  ButtonGroup,
  useToast,
  Input,
} from "@chakra-ui/react";
import { useLiveQuery } from "dexie-react-hooks";
import { MdOutlineChatBubbleOutline } from "react-icons/md";
import { TbCheck, TbTrash } from "react-icons/tb";
import { CgClose } from "react-icons/cg";
import { AiOutlineEdit } from "react-icons/ai";
import { useKey } from "react-use";
import { Link } from "react-router-dom";

import db from "../lib/db";
import { ChatCraftChat } from "../lib/ChatCraftChat";
import { formatDate, formatNumber } from "../lib/utils";

type SidebarItemProps = {
  chat: ChatCraftChat;
  url: string;
  isSelected: boolean;
  canDelete?: boolean;
  canEdit?: boolean;
};

function SidebarItem({ chat, url, isSelected, canDelete, canEdit }: SidebarItemProps) {
  const bg = useColorModeValue(
    isSelected ? "gray.200" : undefined,
    isSelected ? "gray.700" : undefined
  );
  const borderColor = useColorModeValue(
    isSelected ? "gray.300" : "gray.100",
    isSelected ? "gray.800" : "gray.600"
  );
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  useKey("Escape", () => setIsEditing(false), { event: "keydown" }, [setIsEditing]);
  const text = chat.title || chat.summary || chat.summarize() || "(no messages)";

  // If the user clicks away, end editing
  useEffect(() => {
    if (!isSelected) {
      setIsEditing(false);
    }
  }, [isSelected, setIsEditing]);

  const handleSaveTitle = (e: FormEvent<HTMLFormElement>) => {
    console.log("submit", e);
    e.preventDefault();

    const data = new FormData(e.target as HTMLFormElement);
    const title = data.get("title");
    if (typeof title !== "string") {
      return;
    }

    chat.title = title;
    chat
      .update()
      .catch((err) => {
        console.warn("Unable to update title for chat", err);
        toast({
          title: `Error Updating Chat`,
          description: "message" in err ? err.message : undefined,
          status: "error",
          position: "top",
          isClosable: true,
        });
      })
      .finally(() => setIsEditing(false));
  };

  return (
    <Flex
      p={1}
      bg={bg}
      border="1px solid"
      borderColor={borderColor}
      borderRadius={4}
      direction="column"
    >
      <Flex justify="space-between" align="center" minH="32px" w="100%">
        <Link to={url} style={{ width: "100%" }}>
          <Flex align="center" gap={2}>
            <MdOutlineChatBubbleOutline />
            <Text flex={1} fontSize="sm" as="strong">
              {formatDate(chat.date, true)}
            </Text>
          </Flex>
        </Link>
        {isSelected && !isEditing ? (
          <ButtonGroup isAttached>
            {canEdit && (
              <IconButton
                variant="ghost"
                size="sm"
                icon={<AiOutlineEdit />}
                aria-label="Edit title"
                title="Edit title"
                onClick={() => setIsEditing(true)}
              />
            )}
            {canDelete && (
              <IconButton
                variant="ghost"
                size="sm"
                icon={<TbTrash />}
                aria-label="Delete chat"
                title="Delete chat"
              />
            )}
          </ButtonGroup>
        ) : (
          <ButtonGroup>
            <span>&nbsp;</span>
          </ButtonGroup>
        )}
      </Flex>

      <Box flex={1} maxW="100%" minH="24px">
        {isEditing ? (
          <form onSubmit={handleSaveTitle}>
            <Flex align="center">
              <Input
                flex={1}
                defaultValue={chat.title}
                type="text"
                name="title"
                bg="white"
                _dark={{ bg: "gray.700" }}
                size="xs"
                w="100%"
                autoFocus={true}
              />
              <ButtonGroup isAttached>
                <IconButton
                  variant="ghost"
                  size="xs"
                  icon={<CgClose />}
                  aria-label="Cancel"
                  title="Cancel"
                  onClick={() => setIsEditing(false)}
                />
                <IconButton
                  type="submit"
                  variant="ghost"
                  size="xs"
                  icon={<TbCheck />}
                  aria-label="Save"
                  title="Save"
                />
              </ButtonGroup>
            </Flex>
          </form>
        ) : (
          <Link to={url} style={{ width: "100%" }}>
            <Text noOfLines={2} fontSize="sm" title={text} w="100%">
              {text}
            </Text>
          </Link>
        )}
      </Box>
    </Flex>
  );
}

type SidebarProps = {
  selectedChat?: ChatCraftChat;
};

function Sidebar({ selectedChat }: SidebarProps) {
  const [recentCount, setRecentCount] = useState(5);

  const chatsTotal = useLiveQuery<number, number>(() => db.chats.count(), [], 0);

  const recentChats = useLiveQuery<ChatCraftChat[], ChatCraftChat[]>(
    async () => {
      const records = await db.chats.orderBy("date").reverse().limit(recentCount).toArray();
      if (!records) {
        return [];
      }
      const chats = await Promise.all(records.map(({ id }) => ChatCraftChat.find(id)));
      return chats.filter((chat): chat is ChatCraftChat => !!chat);
    },
    [recentCount],
    []
  );

  const sharedChats = useLiveQuery<ChatCraftChat[], ChatCraftChat[]>(
    async () => {
      const records = await db.chats.orderBy("date").reverse().toArray();
      const chats = await Promise.all(
        records.filter((chat) => !!chat.shareUrl).map(({ id }) => ChatCraftChat.find(id))
      );
      return chats.filter((chat): chat is ChatCraftChat => !!chat);
    },
    [],
    []
  );

  function handleShowMoreClick() {
    const newCount = Math.min(recentCount + 10, chatsTotal);
    setRecentCount(newCount);
  }

  return (
    <Flex direction="column" h="100%" p={2} gap={4}>
      <VStack align="left">
        <Flex justify="space-between">
          <Heading as="h3" size="sm">
            Recent Chats
          </Heading>

          <Tag size="sm" variant="subtle" mr={1}>
            {formatNumber(chatsTotal || 0)} Saved Chats
          </Tag>
        </Flex>

        <Flex direction="column" gap={2}>
          {recentChats?.length &&
            recentChats.map((chat) => (
              <SidebarItem
                key={chat.id}
                chat={chat}
                url={`/c/${chat.id}`}
                canDelete={true}
                canEdit={true}
                isSelected={selectedChat?.id === chat.id}
              />
            ))}
        </Flex>

        {recentCount < chatsTotal && (
          <Center>
            <Button size="xs" variant="ghost" onClick={() => handleShowMoreClick()}>
              ({formatNumber(recentCount)} of {formatNumber(chatsTotal)}) Show More...
            </Button>
          </Center>
        )}
      </VStack>

      <Box flex={1}>
        <Heading as="h3" size="sm">
          Shared Chats
        </Heading>

        <>
          {sharedChats?.length ? (
            sharedChats.map((chat) => (
              <SidebarItem
                key={chat.id}
                chat={chat}
                // We've already filtered for all objects with shareUrl, so this is fine
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                url={chat.shareUrl!}
                isSelected={selectedChat?.id === chat.id}
              />
            ))
          ) : (
            <VStack align="left">
              <Text>You don&apos;t have any shared chats yet.</Text>
              <Text>
                Share your first chat by clicking the <strong>Create Public URL...</strong> menu
                option in the chat header menu. Anyone with this URL will be able to read or
                duplicate the chat.
              </Text>
            </VStack>
          )}
        </>
      </Box>
    </Flex>
  );
}

export default Sidebar;
