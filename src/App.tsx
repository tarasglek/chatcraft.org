import { FormEvent, useEffect, useRef, useState } from 'react'
import ReactMarkdown from "react-markdown";
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  // return (
  //   <div className="App">
  //     <div>
  //       <a href="https://vitejs.dev" target="_blank">
  //         <img src={viteLogo} className="logo" alt="Vite logo" />
  //       </a>
  //       <a href="https://reactjs.org" target="_blank">
  //         <img src={reactLogo} className="logo react" alt="React logo" />
  //       </a>
  //     </div>
  //     <h1>Vite + React</h1>
  //     <div className="card">
  //       <button onClick={() => setCount((count) => count + 1)}>
  //         count is {count}
  //       </button>
  //       <p>
  //         Edit <code>src/App.tsx</code> and save to test HMR
  //       </p>
  //     </div>
  //     <p className="read-the-docs">
  //       Click on the Vite and React logos to learn more
  //     </p>
  //   </div>
  // )
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi there! How can I help?" },
  ]);

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
  }, [messages]);

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (userInput.trim() === "") {
      return;
    }

    setLoading(true);
    const context = [...messages, { role: "user", content: userInput }];
    setMessages(context);

    // Send chat history to API
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages: context }),
    });

    // Reset user input
    setUserInput("");

    let data: any = undefined;
    try {
      data = await response.json();
    } catch (err) {
    }

    if (!data) {
      handleError();
      return;
    }

    setMessages((prevMessages) => [
      ...prevMessages,
      { role: "assistant", content: data.result.content },
    ]);
    setLoading(false);
  };


  // Prevent blank submissions and allow for multiline input
  const handleEnter = (e: KeyboardEvent) => {
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
      setMessages((prevMessages) => [
        ...prevMessages,
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
      <div className="topnav">
        <div className="navlogo">
          {/* <Link href="/">Chat UI</Link> */}
        </div>
        <div className="navlinks">
          <a
            href="https://platform.openai.com/docs/models/gpt-4"
            target="_blank"
          >
            Docs
          </a>

        </div>
      </div>
      <main className="main">
        <div className="cloud">
          <div ref={messageListRef} className="messagelist">
            {messages.map((message, index) => {
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
                  {message.role === "assistant" ? (
                    <img
                      src="/openai.png"
                      alt="AI"
                      width="30"
                      height="30"
                      className="boticon"
                    />
                  ) : (
                    <img
                      src="/usericon.png"
                      alt="Me"
                      width="30"
                      height="30"
                      className="usericon"
                    />
                  )}
                  <div className="markdownanswer">
                    {/* Messages are being rendered in Markdown format */}
                    <ReactMarkdown linkTarget={"_blank"}>
                      {message.content}
                    </ReactMarkdown>
                    <div className="mermaid">
                    { "graph LR\nA-->B" }
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="center">
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
          <div className="footer">
            <p>
              Powered by{" "}
              <a href="https://openai.com/" target="_blank">
                OpenAI
              </a>
              .
            </p>
          </div>
        </div>
      </main>
    </>
  );
}

export default App
