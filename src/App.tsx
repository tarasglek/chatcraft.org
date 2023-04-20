import { FormEvent, Key, useEffect, useRef, useState } from "react";
import "./App.css";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { MarkdownWithMermaid } from "./MarkdownWithMermaid";
import { AIChatMessage, BaseChatMessage, HumanChatMessage } from "langchain/schema";
import { CallbackManager } from "langchain/callbacks";

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

function App() {
  const [mouseOverMessageIndex, setMouseOverMessageIndex] = useState(-1);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const initialMessages: BaseChatMessage[] = [
    new AIChatMessage("I am a helpful assistant! How can I help?"),
  ];
  const [messages, _setMessages] = useState(() => {
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
  const [lastMsgMode, setLastMsgMode] = useState(false);
  const [openai_api_key, set_openai_api_key] = useState(() => {
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
  const [selectedGPT, setSelectedGPT] = useState("gpt-3.5-turbo");
  const messageListRef = useRef<HTMLDivElement>(null);

  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll chat to bottom
  useEffect(() => {
    if (messageListRef.current) {
      const messageList = messageListRef.current;
      messageList.scrollTop = messageList.scrollHeight;
    }
    if (textAreaRef.current) {
      textAreaRef.current.focus();
    }
    // refresh mermaid svgs
  }, [messages]);

  // expand textarea
  // https://stackoverflow.com/questions/30050605/display-all-textarea-rows-without-scrolling
  useEffect(() => {
    let textArea = textAreaRef.current;
    if (textArea) {
      textArea.style.height = "1px";
      if (textArea.scrollHeight > textArea.clientHeight) {
        textArea.style.height = `${textArea.scrollHeight}px`;
      }
    }
  }, [userInput]);
  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (userInput.trim() === "") {
      return;
    }

    setLoading(true);
    const allMessages = [...messages, new HumanChatMessage(userInput)];
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
      modelName: selectedGPT,
      callbackManager: CallbackManager.fromHandlers({
        handleLLMNewToken: streamHandler,
      }),
    });
    let response = await chat.call(messagesToSend);
    setMessages([...allMessages, response]);
    // console.log(response, messages )
    setLoading(false);
  };

  // Prevent blank submissions and allow for multiline input
  const handleEnter = (e: any) => {
    if (e.key === "Enter" && userInput) {
      if (!e.shiftKey && userInput) {
        handleSubmit(e as any);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
    }
  };

  // Handle errors
  const handleError = () => {
    setMessages([
      ...messages,
      new AIChatMessage("Oops! There seems to be an error. Please try again."),
    ]);
    setLoading(false);
    setUserInput("");
  };

  return (
    <>
      <div ref={messageListRef} className="message-view">
        {messages.map((message: BaseChatMessage, index: number) => {
          return (
            // The latest message sent by the user will be animated while waiting for a response
            <div key={index} className="message">
              <div
                onMouseOver={(_) => setMouseOverMessageIndex(index)}
                onMouseOut={(_) => setMouseOverMessageIndex(-1)}
                className="avatar"
              >
                <img
                  src={`/${message._getType()}.png`}
                  alt={message._getType()}
                  width="30"
                  height="30"
                  className={message._getType()}
                />
                {mouseOverMessageIndex === index && (
                  <div
                    onClick={(_) => {
                      const newMessages = [...messages];
                      newMessages.splice(index, 1);
                      setMessages(newMessages);
                      setMouseOverMessageIndex(-1);
                    }}
                    style={{
                      width: "30px",
                      height: "30px",
                      fontSize: "20px",
                      backgroundColor: "red",
                      color: "white",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    X
                  </div>
                )}
              </div>
              <div className="message-text">
                {/* Messages are being rendered in Markdown format */}
                <MarkdownWithMermaid>{message.text}</MarkdownWithMermaid>
              </div>
            </div>
          );
        })}
      </div>
      <form onSubmit={handleSubmit}>
        <div className="input-container">
          <textarea
            className="input-text"
            disabled={loading}
            onKeyDown={handleEnter}
            ref={textAreaRef}
            autoFocus={true}
            id="userInput"
            name="userInput"
            placeholder={loading ? "Waiting for response..." : "Type your question..."}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
          />
          <button type="submit" disabled={loading} className="send-button">
            {!loading ? "Send" : "..."}
          </button>
        </div>
      </form>
      <div>
        <label>
          <input
            type="checkbox"
            checked={lastMsgMode}
            onChange={(event) => setLastMsgMode(event.target.checked)}
          />
          Last-message-context-only mode. &nbsp;
        </label>
        <label>
          Model: &nbsp;
          <select
            id="gpt-select"
            value={selectedGPT}
            onChange={(event) => setSelectedGPT(event.target.value)}
            disabled={loading}
          >
            <option value="gpt-4">GPT-4</option>
            <option value="gpt-3.5-turbo">chatgpt</option>
          </select>
        </label>
        <button onClick={(_) => setMessages(initialMessages)}>Clear Chat</button>
      </div>
    </>
  );
}

export default App;
