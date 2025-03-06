import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  CloseButton,
  Flex,
  Grid,
  GridItem,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CgArrowDownO } from "react-icons/cg";
import { ScrollRestoration } from "react-router-dom";

import Header from "../components/Header";
import MessagesView from "../components/MessagesView";
import OptionsButton from "../components/OptionsButton";
import PreferencesModal from "../components/Preferences/PreferencesModal";
import PromptForm from "../components/PromptForm";
import Sidebar from "../components/Sidebar";
import { useAlert } from "../hooks/use-alert";
import useAudioPlayer from "../hooks/use-audio-player";
import { useAutoScroll } from "../hooks/use-autoscroll";
import useChatOpenAI from "../hooks/use-chat-openai";
import { useModels } from "../hooks/use-models";
import { useSettings } from "../hooks/use-settings";
import { useUser } from "../hooks/use-user";
import useChatCompletion from "../hooks/use-chat-completion";
import { ChatCraftChat } from "../lib/ChatCraftChat";
import ChatHeader from "./ChatHeader";

type ChatBaseProps = {
  chat: ChatCraftChat;
};

function ChatBase({ chat }: ChatBaseProps) {
  const { error: apiError } = useModels();
  // When chatting with OpenAI, a streaming message is returned during loading
  const { streamingMessage, callChatApi, cancel, paused, resume, togglePause } = useChatOpenAI();
  const { chatCompletion } = useChatCompletion();
  const { settings, setSettings } = useSettings();
  const { isOpen: isSidebarVisible, onToggle: toggleSidebarVisible } = useDisclosure({
    defaultIsOpen: settings.sidebarVisible,
  });
  const [loading, setLoading] = useState(false);
  const { scrollProgress, shouldAutoScroll, setShouldAutoScroll, scrollBottomRef } =
    useAutoScroll();
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const inputPromptRef = useRef<HTMLTextAreaElement>(null);
  const { error } = useAlert();
  const { user } = useUser();
  const { clearAudioQueue } = useAudioPlayer();
  const [showAlert, setShowAlert] = useState(false);
  const {
    isOpen: isPrefModalOpen,
    onOpen: onPrefModalOpen,
    onClose: onPrefModalClose,
  } = useDisclosure();

  useEffect(() => {
    const providersLength = Object.keys(settings.providers).length;
    setShowAlert(providersLength === 0);
  }, [settings.providers]);

  // Set focus on Prompt Input text area
  const handleChatInputFocus = useCallback((e: KeyboardEvent) => {
    e.preventDefault();
    inputPromptRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleForwardSlash = (e: KeyboardEvent) => {
      // If user is already focused on any text input then don't prevent '/' character entry
      const focusedElement = document.activeElement;
      if (
        focusedElement instanceof HTMLInputElement ||
        focusedElement instanceof HTMLTextAreaElement
      ) {
        return;
      }
      switch (e.key) {
        // '/' Shortcut to focus on Prompt Input text area
        case "/":
          handleChatInputFocus(e);
          break;
        default:
          return;
      }
    };

    document.addEventListener("keydown", handleForwardSlash);

    return () => {
      document.removeEventListener("keydown", handleForwardSlash);
    };
  }, [handleChatInputFocus]);

  // If we can't load models, it's a bad sign for API connectivity.
  // Show an error so the user is aware.
  useEffect(() => {
    if (apiError) {
      error({
        id: "api-error",
        title: `Error Connecting to AI Provider`,
        message: apiError.message,
      });
    }
  }, [apiError, error]);

  const handleToggleSidebarVisible = useCallback(() => {
    const newValue = !isSidebarVisible;
    toggleSidebarVisible();
    setSettings({ ...settings, sidebarVisible: newValue });
  }, [isSidebarVisible, settings, setSettings, toggleSidebarVisible]);

  // Scroll chat to bottom (or to bottom of element specified by scrollBottomRef),
  const forceScroll = useCallback(() => {
    const messageList = messageListRef.current;
    if (!messageList) {
      return;
    }

    const scrollBottom = scrollBottomRef.current;
    if (scrollBottom) {
      // Calculate the new "bottom" based on the scrollBottom element's position
      const newBottom = scrollBottom.offsetTop + scrollBottom.offsetHeight;
      messageList.scrollTop = newBottom - messageList.offsetHeight;
    } else {
      // Scroll to the bottom of the message list instead
      messageList.scrollTop = messageList.scrollHeight;
    }
  }, [messageListRef, scrollBottomRef]);

  // Auto-scroll chat to bottom, but only if user isn't trying to scroll manually.
  // Also add a dependency on the scrollProgress, since it will increase as a
  // response streams in. Also, use the chat's date, since we update that whenever
  // the chat is re-saved to the db
  useEffect(() => {
    if (!shouldAutoScroll) {
      return;
    }

    forceScroll();
  }, [forceScroll, scrollProgress, shouldAutoScroll, chat.date]);

  // Disable auto scroll when we're in the middle of streaming and the user scrolls
  // up to read previous content.
  const handleScroll = useCallback(() => {
    const messageList = messageListRef.current;
    if (!messageList) {
      return;
    }

    // We need a "fudge factor" here, or it constantly loses auto scroll
    // as content streams in and the container is auto-scrolled in the
    // previous useEffect.
    const scrollThreshold = 100;
    const scrollBottom = scrollBottomRef.current;
    let atBottom: boolean;
    if (scrollBottom) {
      // If scrollBottom exists, consider the user to be at the bottom if the bottom of
      // the scrollBottom element is within the viewport
      const scrollBottomBottom = scrollBottom.offsetTop + scrollBottom.offsetHeight;
      atBottom =
        messageList.scrollTop + messageList.clientHeight >= scrollBottomBottom - scrollThreshold;
    } else {
      // If scrollBottom doesn't exist, use the bottom of the message list
      atBottom =
        messageList.scrollTop + messageList.clientHeight >=
        messageList.scrollHeight - scrollThreshold;
    }

    // Disable auto scrolling if the user scrolls up
    // while messages are being streamed
    if (scrollProgress && shouldAutoScroll && !atBottom) {
      setShouldAutoScroll(false);
    }

    // Re-enable it if the user scrolls back to
    // the bottom while messages are streaming
    if (scrollProgress && !shouldAutoScroll && atBottom) {
      setShouldAutoScroll(true);
    }
  }, [scrollBottomRef, scrollProgress, shouldAutoScroll, setShouldAutoScroll, messageListRef]);

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
    async (prompt?: string, imageUrls?: string[]) => {
      setLoading(true);

      try {
        await chatCompletion(prompt, chat, imageUrls);
      } catch (err) {
        error({
          title: `Completion Error`,
          message: `Error with chat completion: ${err}`,
        });
      } finally {
        setLoading(false);
        // Clear any previous audio clips
        clearAudioQueue();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, chat, streamingMessage, setLoading, setShouldAutoScroll, callChatApi, error]
  );

  // Restart auto-scrolling and resume a paused response when Follow Chat is clicked
  function handleFollowChatClick() {
    setShouldAutoScroll(true);
    resume();
  }

  const defaultProviderAlert = useMemo(() => {
    // If we are using default provider, show alert banner to notify user
    if (showAlert) {
      return (
        <Alert
          status="info"
          variant="solid"
          sx={{ py: 1 }}
          display="flex"
          justifyContent="space-between"
        >
          <Box display="flex" alignItems="center">
            <AlertIcon boxSize="4" />
            <AlertDescription fontSize="sm">
              You are using the default free AI Provider, which has limited features.{" "}
              <Text
                as="span"
                cursor="pointer"
                fontSize="sm"
                textDecoration="underline"
                onClick={onPrefModalOpen}
              >
                Click here
              </Text>{" "}
              to add other AI providers.
            </AlertDescription>
          </Box>
          <CloseButton size="sm" onClick={() => setShowAlert(false)} />
        </Alert>
      );
    }
  }, [onPrefModalOpen, showAlert]);

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
        {/* Default Provider Alert Banner*/}
        {defaultProviderAlert}
        <Header
          chatId={chat.id}
          inputPromptRef={inputPromptRef}
          onToggleSidebar={handleToggleSidebarVisible}
        />
      </GridItem>

      {/* Sidebar */}
      <GridItem rowSpan={2} overflowY="auto">
        <Sidebar
          selectedChat={chat}
          isSidebarVisible={isSidebarVisible}
          handleToggleSidebarVisible={handleToggleSidebarVisible}
        ></Sidebar>
      </GridItem>

      <GridItem overflowY="auto" ref={messageListRef} pos="relative">
        <Flex direction="column" h="100%" maxH="100%" maxW="900px" mx="auto" px={1}>
          {
            /* Show a "Follow Chat" button if the user breaks auto scroll during loading */
            !!scrollProgress && !shouldAutoScroll && (
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

          <ChatHeader chat={chat} />

          <ScrollRestoration />

          <MessagesView
            chat={chat}
            newMessage={streamingMessage}
            isLoading={loading}
            onRemoveMessage={(message) => chat.removeMessage(message.id)}
            isPaused={paused}
            onTogglePause={togglePause}
            onCancel={cancel}
            onPrompt={onPrompt}
          />
        </Flex>
      </GridItem>

      <GridItem>
        <Box maxW="900px" mx="auto" h="100%">
          {chat.readonly ? (
            <Flex w="100%" h="45px" justify="end" align="center" p={2}>
              <OptionsButton chat={chat} forkUrl={`./fork`} variant="solid" />
            </Flex>
          ) : (
            <PromptForm
              chat={chat}
              forkUrl={`./fork`}
              onSendClick={onPrompt}
              isLoading={loading}
              previousMessage={chat.messages().at(-1)?.text}
              inputPromptRef={inputPromptRef}
            />
          )}
        </Box>
      </GridItem>

      <PreferencesModal
        isOpen={isPrefModalOpen}
        onClose={onPrefModalClose}
        finalFocusRef={inputPromptRef}
      />
    </Grid>
  );
}

export default ChatBase;
