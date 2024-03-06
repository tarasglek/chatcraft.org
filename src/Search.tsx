import {
  Box,
  Card,
  CardBody,
  Center,
  Flex,
  Grid,
  GridItem,
  Heading,
  useDisclosure,
} from "@chakra-ui/react";
import { useCallback, useRef } from "react";
import { TbListSearch } from "react-icons/tb";
import { redirect, useLoaderData, type LoaderFunctionArgs } from "react-router-dom";

import Header from "./components/Header";
import Message from "./components/Message";
import OptionsButton from "./components/OptionsButton";
import Sidebar from "./components/Sidebar/";
import { useSettings } from "./hooks/use-settings";
import { ChatCraftMessage } from "./lib/ChatCraftMessage";
import db, { ChatCraftMessageTable } from "./lib/db";

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
    // excluding the old "How can I help?" greeting and
    // all other app or system messages, then sort by date.
    messages: await db.messages
      .where("text")
      .notEqual("I am a helpful assistant! How can I help?")
      .filter((message) => {
        // TODO: at some point we may want to allow searching in custom system messages
        // https://github.com/tarasglek/chatcraft.org/issues/129
        if (message.type === "generic" || message.type === "system") {
          return false;
        }

        return re.test(message.text);
      })
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
  const { settings, setSettings } = useSettings();
  const { isOpen: isSidebarVisible, onToggle: toggleSidebarVisible } = useDisclosure({
    defaultIsOpen: settings.sidebarVisible,
  });
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const inputPromptRef = useRef<HTMLTextAreaElement>(null);

  const handleToggleSidebarVisible = useCallback(() => {
    const newValue = !isSidebarVisible;
    toggleSidebarVisible();
    setSettings({ ...settings, sidebarVisible: newValue });
  }, [isSidebarVisible, settings, setSettings, toggleSidebarVisible]);

  return (
    <Grid
      w="100%"
      h="100%"
      gridTemplateRows="min-content 1fr min-content"
      gridTemplateColumns={{
        base: "0 1fr",
        sm: isSidebarVisible ? "300px 4fr" : "0: 1fr",
      }}
      transition={"150ms"}
      bgGradient="linear(to-b, white, gray.100)"
      _dark={{ bgGradient: "linear(to-b, gray.600, gray.700)" }}
    >
      <GridItem colSpan={2}>
        <Header
          inputPromptRef={inputPromptRef}
          searchText={searchText}
          onToggleSidebar={handleToggleSidebarVisible}
        />
      </GridItem>

      <GridItem rowSpan={3} overflowY="auto">
        <Sidebar
          searchText={searchText}
          isSidebarVisible={isSidebarVisible}
          handleToggleSidebarVisible={handleToggleSidebarVisible}
        ></Sidebar>
      </GridItem>

      <GridItem overflowY="auto" ref={messageListRef} pos="relative">
        <Flex direction="column" h="100%" maxH="100%" maxW="900px" mx="auto" px={1}>
          {hasResults ? (
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
                  <Heading as="h2" fontSize="lg">
                    <Flex align="center" gap={2}>
                      <TbListSearch />
                      {`${messages.length} ${
                        messages.length > 1 ? "Messages" : "Message"
                      } found in ${chatIds.length} ${chatIds.length > 1 ? "Chats" : "Chat"}`}
                    </Flex>
                  </Heading>
                </CardBody>
              </Card>

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
        <Flex w="100%" maxW="900px" mx="auto" h="45px" justify="end" align="center" p={2}>
          <OptionsButton variant="solid" />
        </Flex>
      </GridItem>
    </Grid>
  );
}
