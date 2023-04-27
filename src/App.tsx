import { useEffect, useRef, useState } from "react";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { AIChatMessage, HumanChatMessage } from "langchain/schema";
import { CallbackManager } from "langchain/callbacks";
import { Box, Flex, useDisclosure, useColorModeValue, useToast } from "@chakra-ui/react";

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
  const messageListRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // Auto scroll chat to bottom
  useEffect(() => {
    if (messageListRef.current) {
      const messageList = messageListRef.current;
      messageList.scrollTop = messageList.scrollHeight;
    }
  }, [messages]);

  // Handle prompt form submission
  const onPrompt = async (prompt: string) => {
    setLoading(true);
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
    }
  };

  return (
    <Box w="100%" h="100%">
      <Flex flexDir="column" h="100%">
        <Header />

        <Box
          flex="1"
          overflow="auto"
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
