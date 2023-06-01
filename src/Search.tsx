import { useEffect, useRef } from "react";
import {
  Box,
  Button,
  Flex,
  useDisclosure,
  useBreakpoint,
  Grid,
  GridItem,
  Heading,
  Center,
  Tag,
} from "@chakra-ui/react";
import {
  Link as ReactRouterLink,
  type LoaderFunctionArgs,
  redirect,
  useLoaderData,
} from "react-router-dom";

import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import { ChatCraftMessageTable } from "./lib/db";
import Message from "./components/Message";
import { AiGreetingText, ChatCraftMessage } from "./lib/ChatCraftMessage";
import db from "./lib/db";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q");
  if (!q) {
    return redirect("/");
  }

  // Do a case insensitive search
  const re = new RegExp(q, "i");

  return {
    searchText: q,
    // Return all messages that include the search text,
    // excluding the "How can I help?" greeting, sorted
    messages: await db.messages
      .where("text")
      .notEqual(AiGreetingText)
      .filter((message) => re.test(message.text))
      .reverse()
      .sortBy("date"),
  };
}

export default function Search() {
  const { searchText, messages } = useLoaderData() as {
    searchText: string;
    messages: ChatCraftMessageTable[];
  };
  const chatIds = messages ? [...new Set(messages.map((message) => message.chatId))] : [];
  const hasResults = !!messages?.length;

  const {
    isOpen: isSidebarVisible,
    onOpen: showSidebar,
    onClose: hideSidebar,
    onToggle: toggleSidebarVisible,
  } = useDisclosure();
  const breakpoint = useBreakpoint();
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const inputPromptRef = useRef<HTMLTextAreaElement>(null);

  // Hide the sidebar on small/mobile screens by default
  useEffect(() => {
    if (breakpoint === "base" || breakpoint === "sm") {
      hideSidebar();
    } else {
      showSidebar();
    }
  }, [breakpoint, hideSidebar, showSidebar]);

  return (
    <Grid
      w="100%"
      h="100%"
      gridTemplateRows="min-content 1fr min-content"
      gridTemplateColumns={isSidebarVisible ? "minmax(300px, 1fr) 4fr" : "0 1fr"}
      bgGradient="linear(to-b, white, gray.100)"
      _dark={{ bgGradient: "linear(to-b, gray.600, gray.700)" }}
    >
      <GridItem colSpan={2}>
        <Header
          inputPromptRef={inputPromptRef}
          searchText={searchText}
          isSidebarVisible={isSidebarVisible}
          onSidebarVisibleClick={toggleSidebarVisible}
        />
      </GridItem>

      <GridItem rowSpan={2} overflowY="auto">
        <Sidebar />
      </GridItem>

      <GridItem overflowY="auto" ref={messageListRef} pos="relative">
        <Flex direction="column" h="100%" maxH="100%" maxW="900px" mx="auto" px={1}>
          {hasResults ? (
            <>
              <Tag maxW="fit-content" mt={4}>{`${messages.length} ${
                messages.length > 1 ? "Messages" : "Message"
              } Found in ${chatIds.length} ${chatIds.length > 1 ? "Chats" : "Chat"}`}</Tag>
              <Box flex={1}>
                {messages.map((message) => (
                  <Message
                    key={message.id}
                    message={ChatCraftMessage.fromDB(message)}
                    chatId={message.chatId}
                    isLoading={false}
                  />
                ))}
              </Box>
            </>
          ) : (
            <Center h="100%">
              <Heading as="h2" size="sm" mt={4}>
                No Results Found
              </Heading>
            </Center>
          )}
        </Flex>
      </GridItem>

      <GridItem>
        <Flex w="100%" maxW="900px" mx="auto" h="40px" justify="end" align="center" px={2}>
          <ReactRouterLink to="/new">
            <Button variant="link" size="sm">
              New
            </Button>
          </ReactRouterLink>
        </Flex>
      </GridItem>
    </Grid>
  );
}
