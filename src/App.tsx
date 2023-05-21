import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Text,
  useDisclosure,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { CgArrowDownO } from "react-icons/cg";

import PromptForm from "./components/PromptForm";
import MessagesView from "./components/MessagesView";
import Header from "./components/Header";
import useMessages from "./hooks/use-messages";
import useChatOpenAI from "./hooks/use-chat-openai";
import { ChatCraftHumanMessage } from "./lib/ChatCraftMessage";
import { useUser } from "./hooks/use-user";

function App() {
  // When chatting with OpenAI, a streaming message is returned during loading
  const { streamingMessage, callChatApi, cancel, paused, resume, togglePause } = useChatOpenAI();
  // Messages are all the static, previous messages in the chat
  const { messages, tokenInfo, setMessages, removeMessage } = useMessages();
  // Whether to include the whole message chat history or just the last response
  const [singleMessageMode, setSingleMessageMode] = useState(false);
  const { isOpen: isExpanded, onToggle: toggleExpanded } = useDisclosure();
  const [loading, setLoading] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const inputPromptRef = useRef<HTMLTextAreaElement>(null);
  const toast = useToast();
  const { user } = useUser();

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
    const scrollThreshold = 25;
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
      const allMessages = [...messages, new ChatCraftHumanMessage({ text: prompt, user })];

      setShouldAutoScroll(true);
      setMessages(allMessages);
      setLoading(true);

      try {
        // In single-message-mode, trim messages to last 1. Otherwise send all
        const messagesToSend = singleMessageMode ? [...allMessages].slice(-2) : [...allMessages];
        const response = await callChatApi(messagesToSend);
        setMessages([...allMessages, response]);
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
    [
      user,
      messages,
      setMessages,
      singleMessageMode,
      setLoading,
      setShouldAutoScroll,
      callChatApi,
      toast,
    ]
  );

  // Restart auto-scrolling and resume a paused response when Follow Chat is clicked
  function handleFollowChatClick() {
    setShouldAutoScroll(true);
    resume();
  }

  return (
    <Box w="100%" h="100%">
      <Flex flexDir="column" h="100%">
        <Header inputPromptRef={inputPromptRef} />

        <Box
          flex="1"
          overflow="scroll"
          ref={messageListRef}
          bgGradient={useColorModeValue(
            "linear(to-b, white, gray.100)",
            "linear(to-b, gray.600, gray.700)"
          )}
        >
          <MessagesView
            messages={messages}
            newMessage={streamingMessage}
            isLoading={loading}
            onRemoveMessage={removeMessage}
            singleMessageMode={singleMessageMode}
            isPaused={paused}
            onTogglePause={togglePause}
            onCancel={cancel}
            onPrompt={onPrompt}
          />

          {
            /* Show a "Follow Chat" button if the user breaks auto scroll during loading */
            !shouldAutoScroll && (
              <Box position="absolute" top="5em" zIndex="500" w="100%" textAlign="center">
                <Button onClick={() => handleFollowChatClick()}>
                  <CgArrowDownO />
                  <Text ml={2}>Follow Chat</Text>
                </Button>
              </Box>
            )
          }
        </Box>

        <Box flex={isExpanded ? "1" : undefined} bg={useColorModeValue("gray.100", "gray.700")}>
          <Box maxW="900px" mx="auto" h="100%">
            <PromptForm
              messages={messages}
              onPrompt={onPrompt}
              onClear={() => setMessages()}
              isExpanded={isExpanded}
              toggleExpanded={toggleExpanded}
              singleMessageMode={singleMessageMode}
              onSingleMessageModeChange={setSingleMessageMode}
              isLoading={loading}
              previousMessage={messages.at(-1)?.text}
              tokenInfo={tokenInfo}
              inputPromptRef={inputPromptRef}
            />
          </Box>
        </Box>
      </Flex>
    </Box>
  );
}

export default App;
