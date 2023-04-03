import { FormEvent, Key, useEffect, useRef, useState } from 'react'
import ReactMarkdown from "react-markdown";
import './App.css'
import {
  Configuration,
  OpenAIApi,
  ChatCompletionRequestMessageRoleEnum,
  ChatCompletionRequestMessage,
  ChatCompletionResponseMessage,} from "openai";


interface MarkdownWithMermaidProps {
  children: string;
}

const MarkdownWithMermaid: React.FC<MarkdownWithMermaidProps> = ({ children }) => {
  return (
    // <ReactMarkdown linkTarget={"_blank"} children={children}/>
    <ReactMarkdown
    children={children}
    components={{
      code({node, inline, className, children, ...props}) {
        const match = /language-(\w+)/.exec(className || '');
        if (match) {
          console.log('language', match[1])
          if (match[1] === 'mermaid') {
            return (
              <>
              <div className="mermaid">
              { children }
              </div>
              <code className={className} {...props}>
              {children}
              </code>
              </>
              )
            }
          }
        return (
          <code className={className} {...props}>
            {children}
          </code>
        )
      }
    }}
  />
  )
};

function App() {
  const [count, setCount] = useState(0)

  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const initialMessages: ChatCompletionRequestMessage[] = [
    { role: "assistant", content: "I am a helpful assistant! How can I help?" },
  ]
  const [messages, _setMessages] = useState(() => {
    // getting stored value
    const saved = localStorage.getItem("messages");
    if (!saved) {
      return initialMessages
    } else {
      try {
        return JSON.parse(saved)
      } catch (e) {
        return initialMessages
      }
    }
  });
  const setMessages = (messages: ChatCompletionRequestMessage[]) => {
    localStorage.setItem("messages", JSON.stringify(messages));
    _setMessages(messages)
  }
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
        return key
      }
    } else {
      return JSON.parse(saved)
    }
    return ''
  });
  const [selectedGPT, setSelectedGPT] = useState('gpt-3.5-turbo');
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

  useEffect(() => {
    (window as any).mermaid.contentLoaded();
  })
  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (userInput.trim() === "") {
      return;
    }

    setLoading(true);
    const allMessages = [...messages, { role: "user", content: userInput }] as ChatCompletionRequestMessage[];
    setMessages(allMessages);

    const configuration = new Configuration({
      apiKey: openai_api_key,
    });

    const openai = new OpenAIApi(configuration);
    let messagesToSend = [
      // {
      //   role: ChatCompletionRequestMessageRoleEnum.System,
      //   content: "",
      // },
      ...allMessages
    ]
    if (lastMsgMode) {
      //trim messages to last 1
      messagesToSend = messagesToSend.slice(-2)
    }
    // Send chat history to API
    const completion = await openai.createChatCompletion({
      // Downgraded to GPT-3.5 due to high traffic. Sorry for the inconvenience.
      // If you have access to GPT-4, simply change the model to "gpt-4"
      model: selectedGPT,
      messages: messagesToSend,
      temperature: 0,
    });
    let response: ChatCompletionResponseMessage | undefined = completion.data.choices[0].message

    if (!response) {
      return handleError();
    }
    setMessages([
      ...allMessages,
      response as any,
    ]);
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
        {
          role: "assistant",
          content: "Oops! There seems to be an error. Please try again.",
        },
      ]);
      setLoading(false);
      setUserInput("");
    };

  return (
    <>
          <div ref={messageListRef} className="messagelist w_fill">
            {messages.map((message: ChatCompletionRequestMessage, index: number) => {
              return (
                // The latest message sent by the user will be animated while waiting for a response
                <div
                  key={index}
                  className={
                    message.role === "user" &&
                    loading &&
                    index === messages.length - 1
                      ? "usermessagewaiting"
                      : message.role === "assistant"
                      ? "apimessage"
                      : "usermessage"
                  }
                >
                  {/* Display the correct icon depending on the message type */}
                    <img
                      src={`/${message.role}.png`}
                      alt={message.role}
                      width="30"
                      height="30"
                      className={message.role}
                    />
                  <div className="markdownanswer">
                    {/* Messages are being rendered in Markdown format */}
                    <MarkdownWithMermaid>
                      {message.content}
                    </MarkdownWithMermaid>
                  </div>
                </div>
              );
            })}
        </div>
          <div className="cloudform">
            <form onSubmit={handleSubmit}>
              <textarea
                disabled={loading}
                onKeyDown={handleEnter}
                ref={textAreaRef}
                autoFocus={true}
                rows={1}
                maxLength={512}

                id="userInput"
                name="userInput"
                placeholder={
                  loading ? "Waiting for response..." : "Type your question..."
                }
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                className="textarea"
              />
              <button
                type="submit"
                disabled={loading}
                className="generatebutton"
              >
                {loading ? (
                  <div className="loadingwheel">
                    Loading...
                  </div>
                ) : (
                  // Send icon SVG in input field
                  <svg
                    viewBox="0 0 20 20"
                    className="svgicon"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
                  </svg>
                )}
              </button>
            </form>
          </div>
          <div>
            <label>
              <input
                type="checkbox"
                checked={lastMsgMode}
                onChange={(event) => setLastMsgMode(event.target.checked) }
              />
              Last-message-context-only mode. &nbsp;
            </label>
            <label>
            Model: &nbsp;
            <select id="gpt-select" value={selectedGPT} onChange={event => setSelectedGPT(event.target.value)}>
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-3.5-turbo">chatgpt</option>
            </select>
            </label>
            <button onClick={_ => setMessages(initialMessages)}>Clear Chat</button>
          </div>
    </>
  );
}

export default App
