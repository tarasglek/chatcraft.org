import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Link,
  Text,
  useDisclosure,
  useToast,
  Grid,
  GridItem,
  Heading,
  Card,
  CardBody,
  ButtonGroup,
} from "@chakra-ui/react";
import { Form, Link as ReactRouterLink, ScrollRestoration } from "react-router-dom";
import { CgArrowDownO } from "react-icons/cg";
import { MdOutlineChatBubbleOutline } from "react-icons/md";

import PromptForm from "../components/PromptForm";
import MessagesView from "../components/MessagesView";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import useMessages from "../hooks/use-messages";
import useChatOpenAI from "../hooks/use-chat-openai";
import { ChatCraftHumanMessage } from "../lib/ChatCraftMessage";
import { ChatCraftChat } from "../lib/ChatCraftChat";
import { useUser } from "../hooks/use-user";
import NewButton from "../components/NewButton";
import { formatDate } from "../lib/utils";
import { useSettings } from "../hooks/use-settings";
import { useModels } from "../hooks/use-models";

type ChatBaseProps = {
  chat: ChatCraftChat;
  readonly: boolean;
  canDelete: boolean;
};

function ChatBase({ chat, readonly, canDelete }: ChatBaseProps) {
  const { error: apiError } = useModels();
  // TODO: this token stuff is no longer right and useMessages() needs to be removed
  const { tokenInfo } = useMessages();
  // When chatting with OpenAI, a streaming message is returned during loading
  const { streamingMessage, callChatApi, cancel, paused, resume, togglePause } = useChatOpenAI();
  // Whether to include the whole message chat history or just the last response
  const [singleMessageMode, setSingleMessageMode] = useState(false);
  const { isOpen: isExpanded, onToggle: toggleExpanded } = useDisclosure();
  const { settings, setSettings } = useSettings();
  const { isOpen: isSidebarVisible, onToggle: toggleSidebarVisible } = useDisclosure({
    defaultIsOpen: settings.sidebarVisible,
  });
  const [loading, setLoading] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const inputPromptRef = useRef<HTMLTextAreaElement>(null);
  const toast = useToast();
  const { user } = useUser();

  // If we can't load models, it's a bad sign for API connectivity.
  // Show an error so the user is aware.
  useEffect(() => {
    if (apiError) {
      toast({
        id: "api-error",
        title: `Error Updating Message to Version`,
        description: apiError.message,
        status: "error",
        position: "top",
        isClosable: true,
      });
    }
  }, [apiError, toast]);

  const handleToggleSidebarVisible = useCallback(() => {
    const newValue = !isSidebarVisible;
    toggleSidebarVisible();
    setSettings({ ...settings, sidebarVisible: newValue });
  }, [isSidebarVisible, settings, setSettings, toggleSidebarVisible]);

  // Auto scroll chat to bottom, but only if user isn't trying to scroll manually
  // Also add a dependency on the streamingMessage, since its content (and therefore
  // the height of messageList) will change while streaming.
  useEffect(() => {
    if (messageListRef.current && shouldAutoScroll && streamingMessage) {
      const messageList = messageListRef.current;
      messageList.scrollTop = messageList.scrollHeight;
    }
  }, [messageListRef, streamingMessage, shouldAutoScroll]);

  // Disable auto scroll when we're loading and the user scrolls up to read previous content
  const handleScroll = useCallback(() => {
    const messageList = messageListRef.current;
    if (!messageList) {
      return;
    }

    // We need a "fudge factor" here, or it constantly loses auto scroll
    // as content streams in and the container is auto scroll in the
    // previous useEffect.
    const scrollThreshold = 50;
    const atBottom =
      messageList.scrollTop + messageList.clientHeight >=
      messageList.scrollHeight - scrollThreshold;

    // Disable auto scrolling if the user scrolls up
    // while messages are being streamed
    if (loading && shouldAutoScroll && !atBottom) {
      setShouldAutoScroll(false);
    }

    // Re-enable it if the user scrolls back to
    // the bottom while messages are streaming
    if (loading && !shouldAutoScroll && atBottom) {
      setShouldAutoScroll(true);
    }
  }, [loading, shouldAutoScroll, setShouldAutoScroll, messageListRef]);

  // If the user manually scrolls, stop auto scrolling
  useEffect(() => {
    const messageList = messageListRef.current;
    if (messageList) {
      messageList.addEventListener("scroll", handleScroll);
    }
    return () => {
      messageList?.removeEventListener("scroll", handleScroll);
    };
  }, [messageListRef, handleScroll, shouldAutoScroll]);

  // Handle prompt form submission
  const onPrompt = useCallback(
    async (prompt: string) => {
      setShouldAutoScroll(true);
      setLoading(true);

      try {
        // Add this prompt message to the chat
        await chat.addMessage(new ChatCraftHumanMessage({ text: prompt, user }), user);

        // In single-message-mode, trim messages to last few. Otherwise send all.
        // NOTE: we strip out the ChatCraft App messages before sending to OpenAI.
        const messages = chat.nonAppMessages;
        const messagesToSend = singleMessageMode ? [...messages].slice(-2) : [...messages];
        const response = await callChatApi(messagesToSend);

        // Add this response message to the chat
        await chat.addMessage(response, user);
      } catch (err: any) {
        toast({
          title: `OpenAI Response Error`,
          description: "message" in err ? err.message : undefined,
          status: "error",
          position: "top",
          isClosable: true,
        });
      } finally {
        setLoading(false);
        setShouldAutoScroll(true);
      }
    },
    [user, chat, singleMessageMode, setLoading, setShouldAutoScroll, callChatApi, toast]
  );

  // Restart auto-scrolling and resume a paused response when Follow Chat is clicked
  function handleFollowChatClick() {
    setShouldAutoScroll(true);
    resume();
  }

  return (
    <Grid
      w="100%"
      h="100%"
      gridTemplateRows={isExpanded ? "min-content 1fr 1fr" : "min-content 1fr min-content"}
      gridTemplateColumns={{
        base: isSidebarVisible ? "300px 1fr" : "0 1fr",
        sm: isSidebarVisible ? "300px 1fr" : "0 1fr",
        md: isSidebarVisible ? "minmax(300px, 1fr) 4fr" : "0: 1fr",
      }}
      bgGradient="linear(to-b, white, gray.100)"
      _dark={{ bgGradient: "linear(to-b, gray.600, gray.700)" }}
    >
      <GridItem colSpan={2}>
        <Header
          chatId={chat.id}
          inputPromptRef={inputPromptRef}
          onToggleSidebar={handleToggleSidebarVisible}
        />
      </GridItem>

      <GridItem rowSpan={3} overflowY="auto">
        <Sidebar selectedChat={chat} />
      </GridItem>

      <GridItem overflowY="auto" ref={messageListRef} pos="relative">
        <Flex direction="column" h="100%" maxH="100%" maxW="900px" mx="auto" px={1}>
          {
            /* Show a "Follow Chat" button if the user breaks auto scroll during loading */
            !shouldAutoScroll && (
              <Flex
                w="100%"
                maxW="900px"
                mx="auto"
                justify="center"
                position="fixed"
                top="5em"
                zIndex="500"
              >
                <Button onClick={() => handleFollowChatClick()}>
                  <CgArrowDownO />
                  <Text ml={2}>Follow Chat</Text>
                </Button>
              </Flex>
            )
          }

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
                <ButtonGroup isAttached>
                  {chat.shareUrl && user && (
                    <Button
                      size="sm"
                      onClick={() => chat.unshare(user)}
                      variant="ghost"
                      colorScheme="red"
                    >
                      Unshare
                    </Button>
                  )}
                  {canDelete && (
                    <Form action={`/c/${chat.id}/delete`} method="post">
                      <Button type="submit" size="sm" variant="ghost" colorScheme="red">
                        Delete
                      </Button>
                    </Form>
                  )}
                </ButtonGroup>
              </Flex>
            </CardBody>
          </Card>

          <ScrollRestoration />

          <MessagesView
            messages={chat.messages}
            chatId={chat.id}
            newMessage={streamingMessage}
            isLoading={loading}
            onRemoveMessage={(message) => chat.removeMessage(message.id, user)}
            singleMessageMode={singleMessageMode}
            isPaused={paused}
            onTogglePause={togglePause}
            onCancel={cancel}
            onPrompt={onPrompt}
          />
        </Flex>
      </GridItem>

      <GridItem>
        <Box maxW="900px" mx="auto" h="100%">
          {readonly ? (
            <Flex w="100%" h="45px" justify="end" align="center" p={2}>
              <NewButton forkUrl={`./fork`} variant="solid" disableClear={readonly} />
            </Flex>
          ) : (
            <PromptForm
              chat={chat}
              forkUrl={`./fork`}
              onSendClick={onPrompt}
              isExpanded={isExpanded}
              toggleExpanded={toggleExpanded}
              singleMessageMode={singleMessageMode}
              onSingleMessageModeChange={setSingleMessageMode}
              isLoading={loading}
              previousMessage={chat.messages.at(-1)?.text}
              tokenInfo={tokenInfo}
              inputPromptRef={inputPromptRef}
            />
          )}
        </Box>
      </GridItem>
    </Grid>
  );
}

export default ChatBase;
