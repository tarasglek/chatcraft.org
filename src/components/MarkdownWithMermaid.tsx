// TODO: switch to using proper React components for this...
import { useColorModeValue } from "@chakra-ui/react";
import ReactMarkdown from "react-markdown";
import remarkMermaid from "remark-mermaidjs";
import remarkGfm from "remark-gfm";

import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
// We need a light and dark theme, see https://highlightjs.org/static/demo/
import { atomOneLight, atomOneDark } from "react-syntax-highlighter/dist/cjs/styles/hljs";
// Pick all languages to support
import ts from "react-syntax-highlighter/dist/esm/languages/hljs/typescript";
import js from "react-syntax-highlighter/dist/esm/languages/hljs/javascript";
import json from "react-syntax-highlighter/dist/esm/languages/hljs/json";
import css from "react-syntax-highlighter/dist/esm/languages/hljs/css";
// Register all these languages
SyntaxHighlighter.registerLanguage("typescript", ts);
SyntaxHighlighter.registerLanguage("javascript", js);
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("css", css);
SyntaxHighlighter.registerLanguage("typescript", ts);

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
                style={useColorModeValue(atomOneLight, atomOneDark)}
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
