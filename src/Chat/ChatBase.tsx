import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Button, Flex, Text, useDisclosure, useToast, Grid, GridItem } from "@chakra-ui/react";
import { ScrollRestoration } from "react-router-dom";
import { CgArrowDownO } from "react-icons/cg";

import PromptForm from "../components/PromptForm";
import MessagesView from "../components/MessagesView";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import useChatOpenAI from "../hooks/use-chat-openai";
import { ChatCraftFunctionCallMessage, ChatCraftHumanMessage } from "../lib/ChatCraftMessage";
import { ChatCraftChat } from "../lib/ChatCraftChat";
import { useUser } from "../hooks/use-user";
import NewButton from "../components/NewButton";
import { useSettings } from "../hooks/use-settings";
import { useModels } from "../hooks/use-models";
import ChatHeader from "./ChatHeader";
import { ChatCraftFunction } from "../lib/ChatCraftFunction";

type ChatBaseProps = {
  chat: ChatCraftChat;
};

function ChatBase({ chat }: ChatBaseProps) {
  const { error: apiError } = useModels();
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
  // the height of messageList) will change while streaming, and the chat's date
  // since we update that whenever the chat is re-saved to the db
  useEffect(() => {
    if (messageListRef.current && shouldAutoScroll) {
      const messageList = messageListRef.current;
      messageList.scrollTop = messageList.scrollHeight;
    }
  }, [messageListRef, streamingMessage, shouldAutoScroll, chat.date]);

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
    async (prompt?: string) => {
      setShouldAutoScroll(true);
      setLoading(true);

      try {
        let promptMessage: ChatCraftHumanMessage | undefined;
        if (prompt) {
          // Add this prompt message to the chat
          promptMessage = new ChatCraftHumanMessage({ text: prompt, user });
          await chat.addMessage(promptMessage);
        }

        // In single-message-mode, trim messages to last few. Otherwise send all.
        // NOTE: we strip out the ChatCraft App messages before sending to OpenAI.
        const messages = chat.messages({ includeAppMessages: false, includeSystemMessages: true });
        const messagesToSend = singleMessageMode ? [...messages].slice(-2) : messages;

        // If there are any functions mentioned in the chat (via @fn or @fn-url),
        // pass those through to the LLM to use if necessary.
        const functions = await chat.functions();

        // If the user has specified a single function in this prompt, ask LLM to call it.
        let functionToCall: ChatCraftFunction | undefined;
        if (promptMessage && functions) {
          const messageFunctions = await promptMessage.functions();
          if (messageFunctions?.length === 1) {
            functionToCall = messageFunctions[0];
          }
        }

        const response = await callChatApi(messagesToSend, {
          functions,
          functionToCall,
        });

        // Add this response message to the chat
        await chat.addMessage(response);

        // If it's a function call message, invoke the function
        if (response instanceof ChatCraftFunctionCallMessage) {
          const func = await ChatCraftFunction.find(response.func.id);
          if (!func) {
            toast({
              title: `Function Error`,
              description: `No such function: ${response.func.name} (${response.func.id}`,
              status: "error",
              position: "top",
              isClosable: true,
            });
            return;
          }

          const result = await func.invoke(response.func.params);
          // Add this result message to the chat
          await chat.addMessage(result);

          // If the user has opted to always send function results back to LLM, do it now
          if (settings.alwaysSendFunctionResult) {
            onPrompt();
          }
        }
      } catch (err: any) {
        toast({
          title: `Response Error`,
          description: "message" in err ? err.message : undefined,
          status: "error",
          position: "top",
          isClosable: true,
        });
        console.error(err);
      } finally {
        setLoading(false);
        setShouldAutoScroll(true);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

          <ChatHeader chat={chat} />

          <ScrollRestoration />

          <MessagesView
            messages={chat.messages()}
            chatId={chat.id}
            newMessage={streamingMessage}
            isLoading={loading}
            onRemoveMessage={(message) => chat.removeMessage(message.id)}
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
          {chat.readonly ? (
            <Flex w="100%" h="45px" justify="end" align="center" p={2}>
              <NewButton forkUrl={`./fork`} variant="solid" disableClear={chat.readonly} />
            </Flex>
          ) : (
            <PromptForm
              forkUrl={`./fork`}
              onSendClick={onPrompt}
              isExpanded={isExpanded}
              toggleExpanded={toggleExpanded}
              singleMessageMode={singleMessageMode}
              onSingleMessageModeChange={setSingleMessageMode}
              isLoading={loading}
              previousMessage={chat.messages().at(-1)?.text}
              inputPromptRef={inputPromptRef}
            />
          )}
        </Box>
      </GridItem>
    </Grid>
  );
}

export default ChatBase;
