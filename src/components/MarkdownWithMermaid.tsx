import { useColorModeValue } from "@chakra-ui/react";
import ReactMarkdown from "react-markdown";
import remarkMermaid from "remark-mermaidjs";
import remarkGfm from "remark-gfm";

import { PrismAsyncLight as SyntaxHighlighter } from "react-syntax-highlighter";
// We need both a light and dark theme
import oneDark from "react-syntax-highlighter/dist/esm/styles/prism/one-dark";
import oneLight from "react-syntax-highlighter/dist/esm/styles/prism/one-light";

interface MarkdownWithMermaidProps {
  children: string;
}

const MarkdownWithMermaid = ({ children }: MarkdownWithMermaidProps) => {
  return (
    <ReactMarkdown
      className="message-text"
      children={children}
      remarkPlugins={[remarkGfm, remarkMermaid]}
      components={{
        code({ node, inline, className, children, ...props }) {
          if (inline) {
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          }

          // Look for named code fences (e.g., `language-html`)
          const match = /language-(\w+)/.exec(className || "");
          const language = match ? match[1] : "";

          // Include rendered versions of some code blocks before the code
          let prefix = <></>;
          if (language === "mermaid") {
            prefix = <div className="mermaid">{children}</div>;
          } else if (language === "html") {
            prefix = <iframe className="htmlPreview" srcDoc={children as any}></iframe>;
          }

          return (
            <>
              {prefix}
              <SyntaxHighlighter
                children={String(children)}
                language={language}
                style={useColorModeValue(oneLight, oneDark)}
                showLineNumbers={true}
                wrapLongLines={true}
              />
            </>
          );
        },
      }}
    />
  );
};

export default MarkdownWithMermaid;
