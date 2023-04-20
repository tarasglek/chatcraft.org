import { useState } from "react";
import { BaseChatMessage } from "langchain/schema";
import { Box } from "@chakra-ui/react";

import MarkdownWithMermaid from "./MarkdownWithMermaid";

type MessagesViewProps = {
  messages: BaseChatMessage[];
  onRemoveMessage: (index: number) => void;
};

function MessageView({ messages, onRemoveMessage }: MessagesViewProps) {
  const [mouseOverMessageIndex, setMouseOverMessageIndex] = useState(-1);

  return (
    <Box maxW="1024px" mx="auto">
      <div className="message-view">
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
                      onRemoveMessage(index);
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
    </Box>
  );
}

export default MessageView;
