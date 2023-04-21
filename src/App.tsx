import { useEffect, useRef, useState } from "react";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { AIChatMessage, BaseChatMessage, HumanChatMessage } from "langchain/schema";
import { CallbackManager } from "langchain/callbacks";
import { Box, Flex, Text, useDisclosure, useColorModeValue } from "@chakra-ui/react";

import "./App.css";
import PromptForm from "./components/PromptForm";
import PromptIcons from "./components/PromptIcons";
import MessageView from "./components/MessageView";

function obj2msg(obj: { role: string; content: string }): BaseChatMessage {
  console.log(obj.role);
  if (obj.role === "user") {
    return new HumanChatMessage(obj.content);
  } else {
    return new AIChatMessage(obj.content);
  }
}

function msg2obj(msg: BaseChatMessage): { role: string; content: string } {
  if (msg instanceof HumanChatMessage) {
    return { role: "user", content: msg.text };
  } else {
    return { role: "assistant", content: msg.text };
  }
}

const initialMessages: BaseChatMessage[] = [
  new AIChatMessage("I am a helpful assistant! How can I help?"),
];

function App() {
  const { isOpen: isExpanded, onToggle: toggleExpanded } = useDisclosure();
  const [loading, setLoading] = useState(false);
  const [messages, _setMessages] = useState<BaseChatMessage[]>(() => {
    // getting stored value
    const saved = localStorage.getItem("messages");
    if (!saved) {
      return initialMessages;
    } else {
      try {
        return JSON.parse(saved).map(obj2msg) as BaseChatMessage[];
      } catch (e) {
        return initialMessages;
      }
    }
  });
  const setMessages = (messages: BaseChatMessage[]) => {
    localStorage.setItem("messages", JSON.stringify(messages.map(msg2obj)));
    _setMessages(messages);
  };
  const [openai_api_key] = useState(() => {
    // getting stored value
    const saved = localStorage.getItem("openai_api_key");
    if (!saved || saved.length === 0) {
      // get it from user via input func
      const key = prompt("Please enter your OpenAI API key");
      // save it
      if (key) {
        localStorage.setItem("openai_api_key", JSON.stringify(key));
        return key;
      }
    } else {
      return JSON.parse(saved);
    }
    return "";
  });
  const messageListRef = useRef<HTMLDivElement>(null);

  // Auto scroll chat to bottom
  useEffect(() => {
    if (messageListRef.current) {
      const messageList = messageListRef.current;
      messageList.scrollTop = messageList.scrollHeight;
    }
  }, [messages]);

  // Handle prompt form submission
  const onPrompt = async (prompt: string, model: GptModel, lastMsgMode: boolean) => {
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
    if (lastMsgMode) {
      //trim messages to last 1
      messagesToSend = messagesToSend.slice(-2);
    }

    let emptyResponse = new AIChatMessage("");
    setMessages([...allMessages, emptyResponse]);
    let streamHandler = async (token: string) => {
      emptyResponse.text += token;
      setMessages([...allMessages, emptyResponse]);
    };
    // Send chat history to API
    const chat = new ChatOpenAI({
      openAIApiKey: openai_api_key,
      temperature: 0,
      streaming: true,
      modelName: model,
      callbackManager: CallbackManager.fromHandlers({
        handleLLMNewToken: streamHandler,
      }),
    });
    let response = await chat.call(messagesToSend);
    setMessages([...allMessages, response]);
    // console.log(response, messages);
    setLoading(false);
  };

  // Remove a message from the list when the user requests it
  function onRemoveMessage(index: number) {
    const newMessages = [...messages];
    newMessages.splice(index, 1);
    setMessages(newMessages);
  }

  return (
    <Box w="100%" h="100%">
      <Flex flexDir="column" h="100%">
        <Box flex="1" overflow="auto" pb={4} ref={messageListRef}>
          <MessageView messages={messages} onRemoveMessage={onRemoveMessage} />
        </Box>
        <Box
          pos="relative"
          flex={isExpanded ? "2" : undefined}
          pb={2}
          borderTop="1px"
          borderColor={useColorModeValue("gray.200", "gray.500")}
        >
          <PromptIcons isExpanded={isExpanded} toggleExpanded={toggleExpanded} />

          <Box maxW="1024px" mx="auto" h="100%" mt={3}>
            <Text ml={2} fontSize="sm">
              Type your question below. Use <kbd>Shift+Enter</kbd> for newlines.
            </Text>
            <PromptForm
              onPrompt={onPrompt}
              onClear={() => setMessages(initialMessages)}
              isExpanded={isExpanded}
              isLoading={loading}
            />
          </Box>
        </Box>
      </Flex>
    </Box>
  );
}

export default App;
