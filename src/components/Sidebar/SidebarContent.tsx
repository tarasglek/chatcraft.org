import { FormEvent, useEffect, useRef, useState } from "react";

import {
  Box,
  Flex,
  VStack,
  Heading,
  Text,
  Button,
  Center,
  useColorModeValue,
  IconButton,
  Input,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionIcon,
  AccordionPanel,
} from "@chakra-ui/react";
import { useLiveQueryTraced } from "../../lib/performance";
import { MdOutlineChatBubbleOutline } from "react-icons/md";
import { TbCheck, TbTrash } from "react-icons/tb";
import { CgClose } from "react-icons/cg";
import { AiOutlineEdit } from "react-icons/ai";
import { LuSquareFunction } from "react-icons/lu";
import { useKey } from "react-use";
import { Link, useNavigate } from "react-router-dom";

import db from "../../lib/db";
import { ChatCraftChat } from "../../lib/ChatCraftChat";
import { formatNumber } from "../../lib/utils";
import { SharedChatCraftChat } from "../../lib/SharedChatCraftChat";
import { useUser } from "../../hooks/use-user";
import { ChatCraftFunction } from "../../lib/ChatCraftFunction";
import { useAlert } from "../../hooks/use-alert";
import { convertToShareUrl } from "../../lib/share";
import { useLocalStorage } from "react-use";

/**
 * Chat Sidebar Items
 */
type ChatSidebarItemProps = {
  chat: ChatCraftChat;
  url: string;
  isSelected: boolean;
  canEdit?: boolean;
  onDelete: () => void;
};

function ChatSidebarItem({ chat, url, isSelected, canEdit, onDelete }: ChatSidebarItemProps) {
  const text = chat.summary || "(no messages)";
  const bg = useColorModeValue(
    isSelected ? "gray.200" : undefined,
    isSelected ? "gray.800" : undefined
  );
  const borderColor = useColorModeValue(
    isSelected ? "gray.300" : "gray.100",
    isSelected ? "gray.900" : "gray.600"
  );
  const { error } = useAlert();
  const [isEditing, setIsEditing] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
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
        error({
          title: `Error Updating Chat`,
          message: err.message,
        });
      })
      .finally(() => setIsEditing(false));
  };

  const formattedDate = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(chat.date);

  const todayDate = new Date();

  const currentMonth =
    todayDate.getFullYear() === chat.date.getFullYear() &&
    todayDate.getMonth() === chat.date.getMonth();

  const isToday = currentMonth && todayDate.getDate() === chat.date.getDate();
  const isYesterday = currentMonth && todayDate.getDate() - 1 === chat.date.getDate();

  return (
    <Flex
      p={1}
      bg={bg}
      border="1px solid"
      borderColor={borderColor}
      borderRadius={4}
      direction="column"
      ref={selectedRef}
      style={{ transition: "background-color 0.2s ease, transform 0.2s ease" }}
      _hover={{
        bg: useColorModeValue(
          !isSelected ? "gray.100" : undefined,
          !isSelected ? "gray.700" : undefined
        ),
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <Flex justify="space-between" align="center" minH="32px" w="100%">
        <Link to={url} style={{ width: "100%" }}>
          <Flex align="center">
            <Box px={2}>
              <MdOutlineChatBubbleOutline />
            </Box>
            <Text flex={1} fontSize="sm" as="strong">
              {isToday ? "Today" : isYesterday ? "Yesterday" : formattedDate}
            </Text>
          </Flex>
        </Link>
        {(isSelected || isHovering) && !isEditing && (
          <Flex>
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
          </Flex>
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
                fontSize="1rem"
                name="summary"
                bg="white"
                _dark={{ bg: "gray.700" }}
                size="sm"
                borderRadius={4}
                mx={1}
                w="100%"
                autoFocus={true}
              />
              <Flex>
                <IconButton
                  variant="ghost"
                  size="sm"
                  icon={<CgClose />}
                  aria-label="Cancel"
                  title="Cancel"
                  onClick={() => setIsEditing(false)}
                />
                <IconButton
                  type="submit"
                  variant="ghost"
                  size="sm"
                  icon={<TbCheck />}
                  aria-label="Save"
                  title="Save"
                />
              </Flex>
            </Flex>
          </form>
        ) : (
          <Link to={url} style={{ width: "100%" }}>
            <Text noOfLines={2} px={2} fontSize="sm" title={text} w="100%">
              {text}
            </Text>
          </Link>
        )}
      </Box>
    </Flex>
  );
}

/**
 * Function Sidebar Items
 */

type FunctionSidebarItemProps = {
  func: ChatCraftFunction;
  url: string;
  isSelected: boolean;
  onDelete: () => void;
};

function FunctionSidebarItem({ func, url, isSelected, onDelete }: FunctionSidebarItemProps) {
  const bg = useColorModeValue(
    isSelected ? "gray.200" : undefined,
    isSelected ? "gray.800" : undefined
  );
  const borderColor = useColorModeValue(
    isSelected ? "gray.300" : "gray.100",
    isSelected ? "gray.900" : "gray.600"
  );
  const selectedRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);

  // Scroll this item into view if selected
  useEffect(() => {
    if (selectedRef.current && isSelected) {
      selectedRef.current.scrollIntoView();
    }
  }, [selectedRef, isSelected]);

  return (
    <Flex
      p={1}
      bg={bg}
      border="1px solid"
      borderColor={borderColor}
      borderRadius={4}
      direction="column"
      ref={selectedRef}
      _hover={{
        bg: useColorModeValue(
          !isSelected ? "gray.100" : undefined,
          !isSelected ? "gray.700" : undefined
        ),
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <Flex justify="space-between" align="center" minH="32px" w="100%">
        <Link to={url} style={{ width: "100%" }}>
          <Flex align="center">
            <Box px={2}>
              <LuSquareFunction />
            </Box>
            <Text flex={1} fontSize="sm" as="strong">
              {func.prettyName}
            </Text>
          </Flex>
        </Link>
        {(isSelected || isHovering) && (
          <IconButton
            variant="ghost"
            size="sm"
            icon={<TbTrash />}
            aria-label="Delete function"
            title="Delete function"
            onClick={onDelete}
          />
        )}
      </Flex>

      <Box flex={1} maxW="100%" minH="24px">
        <Link to={url} style={{ width: "100%" }}>
          <Text noOfLines={2} px={2} fontSize="sm" title={func.description} w="100%">
            {func.description}
          </Text>
        </Link>
      </Box>
    </Flex>
  );
}

/**
 * Sidebar
 */

export type SidebarContentProps = {
  selectedChat?: ChatCraftChat;
  selectedFunction?: ChatCraftFunction;
};

function SidebarContent({ selectedChat, selectedFunction }: SidebarContentProps) {
  const { user } = useUser();
  const navigate = useNavigate();
  const [recentCount, setRecentCount] = useState(10);

  const [openIndex, setOpenIndex] = useLocalStorage<number | number[] | undefined>(
    "sidebar-accordion-index",
    0
  );

  const handleAccordionChange = (expandedIndex: number | number[] | undefined) => {
    // Check if expandedIndex isn't undefined and set index to this value, otherwise set index to 0
    setOpenIndex(expandedIndex ?? 0);
  };

  const chatsTotal = useLiveQueryTraced<number, number>(
    "count-chats",
    () => db.chats.count(),
    [],
    0
  );

  const recentChats = useLiveQueryTraced<ChatCraftChat[], ChatCraftChat[]>(
    "recent-chats",
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

  const functions = useLiveQueryTraced<ChatCraftFunction[], ChatCraftFunction[]>(
    "recent-functions",
    async () => {
      const records = await db.functions.orderBy("date").reverse().limit(recentCount).toArray();
      if (!records) {
        return [];
      }
      const functions = await Promise.all(records.map(({ id }) => ChatCraftFunction.find(id)));
      return functions.filter((func): func is ChatCraftFunction => !!func);
    },
    [recentCount],
    []
  );

  const sharedChats = useLiveQueryTraced<SharedChatCraftChat[], SharedChatCraftChat[]>(
    "shared-chats",
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
        // If we're currently looking at this chat, switch to a new one
        if (selectedChat?.id === id) {
          navigate("/");
        }
      })
      .catch((err) => console.warn("Unable to delete chat", err));
  }

  function handleDeleteFunction(id: string) {
    ChatCraftFunction.delete(id)
      .then(() => {
        // If we're currently looking at this function, switch to a new one
        if (selectedFunction?.id === id) {
          navigate("/");
        }
      })
      .catch((err) => console.warn("Unable to delete function", err));
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
      <Accordion allowToggle index={openIndex} onChange={handleAccordionChange}>
        <AccordionItem>
          <AccordionButton p={2} minH={10}>
            <Heading as="h3" size="xs">
              Saved Chats ({formatNumber(chatsTotal || 0)})
            </Heading>

            <Button as={Link} to="/c/new" ml={1} size="xs" variant="ghost">
              New
            </Button>

            <AccordionIcon ml="auto" />
          </AccordionButton>

          <AccordionPanel p={0} pb={4}>
            <Flex direction="column" gap={2}>
              {recentChats?.length > 0 &&
                recentChats.map((chat) => (
                  <ChatSidebarItem
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
              <Center mt={4}>
                <Button size="xs" variant="ghost" onClick={() => handleShowMoreClick()}>
                  ({formatNumber(recentCount)} of {formatNumber(chatsTotal)}) Show More...
                </Button>
              </Center>
            )}
          </AccordionPanel>
        </AccordionItem>

        <AccordionItem>
          <AccordionButton p={2} minH={10}>
            <Heading as="h3" size="xs">
              Shared Chats ({formatNumber(sharedChats.length || 0)})
            </Heading>
            <AccordionIcon ml="auto" />
          </AccordionButton>
          <AccordionPanel p={0} pb={4}>
            {sharedChats?.length ? (
              sharedChats.map((shared) => (
                <ChatSidebarItem
                  key={shared.id}
                  chat={shared.chat}
                  url={convertToShareUrl(shared.url)}
                  isSelected={selectedChat?.id === shared.id}
                  onDelete={() => handleDeleteSharedChat(shared.id)}
                />
              ))
            ) : (
              <VStack px={2} align="left">
                <Text>You don&apos;t have any shared chats yet.</Text>
                <Text>
                  Share your first chat by clicking the <strong>Share Chat...</strong> menu option
                  in the chat header menu.
                </Text>
                <Text>Anyone with this URL will be able to read or duplicate the chat.</Text>
              </VStack>
            )}
          </AccordionPanel>
        </AccordionItem>

        <AccordionItem>
          <AccordionButton p={2} minH={10}>
            <Flex justify="space-between" align="center">
              <Heading as="h3" size="xs">
                Functions ({formatNumber(functions.length || 0)})
              </Heading>

              {functions?.length > 0 && (
                <Button as={Link} to="/f/new" ml={1} size="xs" variant="ghost">
                  New
                </Button>
              )}
            </Flex>
            <AccordionIcon ml="auto" />
          </AccordionButton>
          <AccordionPanel p={0} pb={4}>
            {functions?.length ? (
              functions.map((func) => (
                <FunctionSidebarItem
                  key={func.id}
                  func={func}
                  url={`/f/${func.id}`}
                  isSelected={selectedFunction?.id === func.id}
                  onDelete={() => handleDeleteFunction(func.id)}
                />
              ))
            ) : (
              <VStack px={2} align="left">
                <Text>You don&apos;t have any functions yet.</Text>
                <Text>Functions can be called by some models to perform tasks.</Text>
                <Link to="/f/new" style={{ textDecoration: "underline" }}>
                  Create a function
                </Link>
              </VStack>
            )}
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </Flex>
  );
}

export default SidebarContent;
