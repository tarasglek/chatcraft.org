import { useEffect, useRef, useState } from "react";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { AIChatMessage, HumanChatMessage } from "langchain/schema";
import { CallbackManager } from "langchain/callbacks";
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
import MessageView from "./components/MessageView";
import Header from "./components/Header";
import { useSettings } from "./hooks/use-settings";
import useMessages from "./hooks/use-messages";

function App() {
  const { messages, setMessages, removeMessage } = useMessages();
  const [singleMessageMode, setSingleMessageMode] = useState(false);
  const { settings } = useSettings();
  const { isOpen: isExpanded, onToggle: toggleExpanded } = useDisclosure();
  const [loading, setLoading] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const messageListRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // Auto scroll chat to bottom, but only if user isn't trying to scroll manually
  useEffect(() => {
    if (messageListRef.current && shouldAutoScroll) {
      const messageList = messageListRef.current;
      messageList.scrollTop = messageList.scrollHeight;
    }
  }, [messages, shouldAutoScroll]);

  // If the user manually scrolls, stop auto scrolling
  useEffect(() => {
    const messageList = messageListRef.current;
    if (!messageList) {
      return;
    }

    // Disable auto scroll when we're loading and the user scrolls up to read previous content
    const handleScroll = () => {
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
    };
    messageList.addEventListener("scroll", handleScroll);
    return () => {
      messageList.removeEventListener("scroll", handleScroll);
    };
  }, [messageListRef, loading, shouldAutoScroll]);

  // Handle prompt form submission
  const onPrompt = async (prompt: string) => {
    setLoading(true);
    setShouldAutoScroll(true);

    const allMessages = [...messages, new HumanChatMessage(prompt)];
    setMessages(allMessages);

    let messagesToSend = [
      // {
      //   role: ChatCompletionRequestMessageRoleEnum.System,
      //   content: "",
      // },
      ...allMessages,
    ];
    if (singleMessageMode) {
      //trim messages to last 1
      messagesToSend = messagesToSend.slice(-2);
    }

    try {
      let emptyResponse = new AIChatMessage("");
      setMessages([...allMessages, emptyResponse]);

      // Send chat history to API
      const chat = new ChatOpenAI({
        openAIApiKey: settings.apiKey,
        temperature: 0,
        streaming: true,
        modelName: settings.model,
        callbackManager: CallbackManager.fromHandlers({
          async handleLLMNewToken(token: string) {
            emptyResponse.text += token;
            setMessages([...allMessages, emptyResponse]);
          },
          async handleChainError(err: any, runId?: string, parentRunId?: string) {
            console.log("handleChainError", err);
          },
          async handleLLMError(err: any, runId?: string, parentRunId?: string) {
            console.log("handleLLMError", err);
          },
        }),
      });
      const response = await chat.call(messagesToSend);
      setMessages([...allMessages, response]);
      // console.log(response, messages);
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
  };

  return (
    <Box w="100%" h="100%">
      <Flex flexDir="column" h="100%">
        <Header />

        <Box
          flex="1"
          overflow="scroll"
          pb={4}
          ref={messageListRef}
          bgGradient={useColorModeValue(
            "linear(to-b, white, gray.100)",
            "linear(to-b, gray.600, gray.700)"
          )}
        >
          <MessageView
            messages={messages}
            onRemoveMessage={removeMessage}
            singleMessageMode={singleMessageMode}
            loading={loading}
          />

          {!shouldAutoScroll && (
            <Box position="absolute" top="5em" zIndex="500" w="100%" textAlign="center">
              <Button onClick={() => setShouldAutoScroll(true)}>
                <CgArrowDownO />
                <Text ml={2}>Follow Chat</Text>
              </Button>
            </Box>
          )}
        </Box>

        <Box
          flex={isExpanded ? "1" : undefined}
          pb={2}
          bg={useColorModeValue("gray.100", "gray.700")}
        >
          <Box maxW="900px" mx="auto" h="100%">
            <PromptForm
              onPrompt={onPrompt}
              onClear={() => setMessages()}
              isExpanded={isExpanded}
              toggleExpanded={toggleExpanded}
              singleMessageMode={singleMessageMode}
              onSingleMessageModeChange={setSingleMessageMode}
              isLoading={loading}
              previousMessage={messages.at(-1)?.text}
            />
          </Box>
        </Box>
      </Flex>
    </Box>
  );
}

export default App;
