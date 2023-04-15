import { FormEvent, Key, useEffect, useRef, useState } from 'react'
import './App.css'
import {
  Configuration,
  OpenAIApi,
  ChatCompletionRequestMessageRoleEnum,
  ChatCompletionRequestMessage,
  ChatCompletionResponseMessage,} from "openai";
import { MarkdownWithMermaid } from './MarkdownWithMermaid';

function App() {
  const [mouseOverMessageIndex, setMouseOverMessageIndex] = useState(-1)
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
    let mermaid = (window as any).mermaid
    if (mermaid) {
      mermaid.contentLoaded();
    }
  })
  // expand textarea
  // https://stackoverflow.com/questions/30050605/display-all-textarea-rows-without-scrolling
  useEffect(() => {
    let textArea = textAreaRef.current
    if (textArea) {
      textArea.style.height = '1px'
      if (textArea.scrollHeight > textArea.clientHeight) {
        textArea.style.height = `${textArea.scrollHeight}px`;
      }
    }}, [userInput])
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
          <div ref={messageListRef} className="message-view">
            {messages.map((message: ChatCompletionRequestMessage, index: number) => {
              return (
                // The latest message sent by the user will be animated while waiting for a response
                <div
                  key={index}
                  className="message"
                >
                  <div onMouseOver={_ => setMouseOverMessageIndex(index)} onMouseOut={_ => setMouseOverMessageIndex(-1)} className="avatar">
                    <img
                      src={`/${message.role}.png`}
                      alt={message.role}
                      width="30"
                      height="30"
                      className={message.role}
                    />
                    {mouseOverMessageIndex === index && (
                    <div
                    onClick={
                      _ => {
                        const newMessages = [...messages]
                        newMessages.splice(index, 1)
                        setMessages(newMessages)
                        setMouseOverMessageIndex(-1)
                      }
                    }
                    style={{width: '30px', height: '30px', fontSize: '20px', backgroundColor: 'red', color: 'white', border: 'none', cursor: 'pointer', textAlign: 'center'}}
                    >X
                    </div>
                    )}
                  </div>
                  <div className="message-text">
                    {/* Messages are being rendered in Markdown format */}
                    <MarkdownWithMermaid>
                      {message.content}
                    </MarkdownWithMermaid>
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
                placeholder={
                  loading ? "Waiting for response..." : "Type your question..."
                }
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
              />
              <button type="submit" disabled={loading} className="send-button" >
              Send
              </button>
          </div>
            </form>
          <div>
            <label>
              <input type="checkbox" checked={lastMsgMode} onChange={(event) => setLastMsgMode(event.target.checked) } />
              Last-message-context-only mode. &nbsp;
            </label>
            <label>
            Model: &nbsp;
            <select id="gpt-select" value={selectedGPT} onChange={event => setSelectedGPT(event.target.value)} disabled={loading}>
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
