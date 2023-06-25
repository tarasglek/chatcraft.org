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
} from "@chakra-ui/react";
import { useLiveQuery } from "dexie-react-hooks";
import { MdOutlineChatBubbleOutline } from "react-icons/md";
import { CgClose } from "react-icons/cg";

import db, { type ChatCraftChatTable } from "../lib/db";
import { Form, Link } from "react-router-dom";
import { useState } from "react";
import { ChatCraftChat } from "../lib/ChatCraftChat";
import { formatDate, formatNumber } from "../lib/utils";

type SidebarItemProps = {
  text: string;
  url: string;
  isSelected: boolean;
  canDelete?: boolean;
};

function SidebarItem({ text, url, isSelected, canDelete }: SidebarItemProps) {
  const bg = useColorModeValue(
    isSelected ? "gray.200" : undefined,
    isSelected ? "gray.700" : undefined
  );
  const border = isSelected ? "1px solid" : "1px solid transparent";
  const borderColor = useColorModeValue(
    isSelected ? "gray.300" : undefined,
    isSelected ? "gray.800" : undefined
  );

  return (
    <Flex gap={2} p={1} bg={bg} border={border} borderColor={borderColor} borderRadius={4}>
      <VStack mt={1} gap={1} minH={14}>
        <Flex w={6} h={6} justify="center" align="center">
          <MdOutlineChatBubbleOutline />
        </Flex>
        {isSelected && canDelete && (
          <Form action={`${url}/delete`} method="post">
            <IconButton
              size="xs"
              variant="ghost"
              type="submit"
              icon={<CgClose />}
              aria-label="Delete chat"
              title="Delete chat"
              colorScheme="red"
            />
          </Form>
        )}
      </VStack>
      <Box flex={1} maxW="100%">
        <Link to={url}>
          <Text noOfLines={4} fontSize="sm" title={text}>
            {text}
          </Text>
        </Link>
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

  const sharedChats = useLiveQuery<ChatCraftChatTable[], ChatCraftChatTable[]>(
    async () =>
      db.chats
        .filter((chat) => !!chat.shareUrl)
        .sortBy("date")
        .then((results) => results.reverse()),
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

        <Box>
          {recentChats?.length &&
            recentChats.map((chat) => (
              <SidebarItem
                key={chat.id}
                text={`${formatDate(chat.date, true)} - ${chat.summarize() || "(no messages)"}`}
                url={`/c/${chat.id}`}
                canDelete={true}
                isSelected={selectedChat?.id === chat.id}
              />
            ))}
        </Box>

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
            sharedChats.map(({ id, date, summary, shareUrl }) => (
              <SidebarItem
                key={id}
                text={`${formatDate(date, true)} - ${summary}`}
                // We've already filtered for all objects with shareUrl, so this is fine
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                url={shareUrl!}
                isSelected={selectedChat?.id === id}
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
