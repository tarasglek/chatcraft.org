import { FormEvent, useEffect, useRef, useState } from "react";

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
  Divider,
} from "@chakra-ui/react";
import { useLiveQuery } from "dexie-react-hooks";
import { MdOutlineChatBubbleOutline } from "react-icons/md";
import { TbCheck, TbTrash } from "react-icons/tb";
import { CgClose } from "react-icons/cg";
import { AiOutlineEdit } from "react-icons/ai";
import { useKey } from "react-use";
import { Link, useNavigate } from "react-router-dom";

import db from "../lib/db";
import { ChatCraftChat } from "../lib/ChatCraftChat";
import { formatDate, formatNumber } from "../lib/utils";
import { SharedChatCraftChat } from "../lib/SharedChatCraftChat";
import { useUser } from "../hooks/use-user";

type SidebarItemProps = {
  chat: ChatCraftChat;
  url: string;
  isSelected: boolean;
  canEdit?: boolean;
  onDelete: () => void;
};

function SidebarItem({ chat, url, isSelected, canEdit, onDelete }: SidebarItemProps) {
  const text = chat.summary || "(no messages)";
  const bg = useColorModeValue(
    isSelected ? "gray.200" : undefined,
    isSelected ? "gray.800" : undefined
  );
  const borderColor = useColorModeValue(
    isSelected ? "gray.300" : "gray.100",
    isSelected ? "gray.900" : "gray.600"
  );
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  useKey("Escape", () => setIsEditing(false), { event: "keydown" }, [setIsEditing]);
  const selectedRef = useRef<HTMLDivElement>(null);

  // If the user clicks away, end editing
  useEffect(() => {
    if (!isSelected) {
      setIsEditing(false);
    }
  }, [isSelected, setIsEditing]);

  // Scroll this item into view if selected
  useEffect(() => {
    if (selectedRef.current && isSelected) {
      selectedRef.current.scrollIntoView();
    }
  }, [selectedRef, isSelected]);

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
      ref={selectedRef}
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
                aria-label="Edit summary"
                title="Edit summary"
                onClick={() => setIsEditing(true)}
              />
            )}
            <IconButton
              variant="ghost"
              size="sm"
              icon={<TbTrash />}
              aria-label="Delete chat"
              title="Delete chat"
              onClick={onDelete}
            />
          </ButtonGroup>
        ) : (
          <ButtonGroup>
            <span>&nbsp;</span>
          </ButtonGroup>
        )}
      </Flex>

      <Box flex={1} maxW="100%" minH="24px">
        {isEditing ? (
          <form onSubmit={handleSaveSummary}>
            <Flex align="center">
              <Input
                flex={1}
                defaultValue={chat.summary}
                type="text"
                name="summary"
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
  const { user } = useUser();
  const navigate = useNavigate();
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

  const sharedChats = useLiveQuery<SharedChatCraftChat[], SharedChatCraftChat[]>(
    async () => {
      const records = await db.shared.toArray();
      if (!records) {
        return [];
      }
      return records.map((record) => SharedChatCraftChat.fromDB(record));
    },
    [],
    []
  );

  function handleShowMoreClick() {
    const newCount = Math.min(recentCount + 10, chatsTotal);
    setRecentCount(newCount);
  }

  function handleDeleteChat(id: string) {
    ChatCraftChat.delete(id)
      .then(() => {
        // If we're currently looking at this shared chat, switch to a new one
        if (selectedChat?.id === id) {
          navigate("/");
        }
      })
      .catch((err) => console.warn("Unable to delete chat", err));

    // If we're currently looking at this chat, switch to a new one
    if (selectedChat?.id === id) {
      navigate("/");
    }
  }

  function handleDeleteSharedChat(id: string) {
    if (!user) {
      return;
    }
    SharedChatCraftChat.delete(user, id)
      .then(() => {
        // If we're currently looking at this shared chat, switch to a new one
        if (selectedChat?.id === id) {
          navigate("/");
        }
      })
      .catch((err) => console.warn("Unable to delete shared chat", err));
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
                canEdit={true}
                isSelected={selectedChat?.id === chat.id}
                onDelete={() => handleDeleteChat(chat.id)}
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

      <Divider />

      <VStack align="left" flex={1}>
        <Flex justify="space-between">
          <Heading as="h3" size="sm">
            Shared Chats
          </Heading>

          {!!sharedChats?.length && (
            <Tag size="sm" variant="subtle" mr={1}>
              {formatNumber(sharedChats.length || 0)} Shared Chats
            </Tag>
          )}
        </Flex>

        <Box>
          {sharedChats?.length ? (
            sharedChats.map((shared) => (
              <SidebarItem
                key={shared.id}
                chat={shared.chat}
                url={shared.url}
                isSelected={selectedChat?.id === shared.id}
                onDelete={() => handleDeleteSharedChat(shared.id)}
              />
            ))
          ) : (
            <VStack align="left">
              <Text>You don&apos;t have any shared chats yet.</Text>
              <Text>
                Share your first chat by clicking the <strong>Share Chat...</strong> menu option in
                the chat header menu. Anyone with this URL will be able to read or duplicate the
                chat.
              </Text>
            </VStack>
          )}
        </Box>
      </VStack>
    </Flex>
  );
}

export default Sidebar;
