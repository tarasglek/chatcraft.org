import { memo } from "react";
import { Box, useColorModeValue } from "@chakra-ui/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeExternalLinks from "rehype-external-links";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

// Use highlight.js (via lowlight) vs. prism.js (via refractor) due to
// https://github.com/tarasglek/chatcraft.org/issues/32
import { LightAsync as SyntaxHighlighter } from "react-syntax-highlighter";
// We need both a light and dark theme
import oneDark from "react-syntax-highlighter/dist/esm/styles/hljs/atom-one-dark";
import oneLight from "react-syntax-highlighter/dist/esm/styles/hljs/atom-one-light";

import CodeHeader from "./CodeHeader";
import HtmlPreview from "./HtmlPreview";
import MermaidPreview from "./MermaidPreview";
import NomnomlPreview from "./NomnomlPreview";

const fixLanguageName = (language: string | null) => {
  if (!language) {
    return "text";
  }

  // Allow for common short-forms, but map back to known language names
  switch (language) {
    case "js":
    case "jsx":
      return "javascript";
    case "ts":
    case "tsx":
      return "typescript";
    case "yml":
      return "yaml";
    case "objective":
    case "objective-c":
      return "objectivec";
    case "asm":
    case "assembly":
      return "armasm";
    case "sh":
    case "shell":
      return "bash";
    case "html":
      return "xml";
    default:
      return language;
  }
};

type MarkdownProps = {
  previewCode?: boolean;
  isLoading: boolean;
  onPrompt?: ({
    prompt,
    imageUrls,
    retry,
  }: {
    prompt?: string;
    imageUrls?: string[];
    retry?: boolean;
  }) => void;
  children: string;
  className?: string;
};

function Markdown({
  previewCode,
  isLoading,
  onPrompt,
  children,
  className = "message-text",
}: MarkdownProps) {
  const style = useColorModeValue(oneLight, oneDark);

  return (
    <ReactMarkdown
      className={className}
      children={children}
      remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: false }]]}
      rehypePlugins={[
        // Open links in new tab
        [rehypeExternalLinks, { target: "_blank" }],
        rehypeKatex,
      ]}
      components={{
        code({ className, children, ...props }) {
          // Look for named code blocks (e.g., `language-html`) allowing for
          // R Markdown code blocks as well, which look like {r} vs. r or
          // {python} vs. python
          const match = /language-{?(\w+)/.exec(className || "");
          const code = String(children);
          // If we don't have a language-... match and single line, it's inline code
          if (!match && !code.includes("\n")) {
            return (
              <code className="inline-code" {...props}>
                {children}
              </code>
            );
          }

          const language = match ? match[1] : "text";

          // Include rendered versions of some code blocks before the code
          let preview = null;
          if (previewCode === undefined || previewCode === true) {
            if (language === "html") {
              preview = (
                <HtmlPreview
                  children={Array.isArray(children) ? children : [children]}
                  isLoading={isLoading}
                />
              );
            } else if (language === "mermaid") {
              preview = (
                <MermaidPreview children={Array.isArray(children) ? children : [children]} />
              );
            } else if (language === "nomnoml") {
              preview = (
                <NomnomlPreview children={Array.isArray(children) ? children : [children]} />
              );
            }
          }

          return (
            <>
              <Box
                fontSize="0.9em"
                border="1px"
                borderRadius="5px"
                borderColor="gray.200"
                bg="gray.50"
                _dark={{
                  bg: "gray.800",
                  borderColor: "gray.600",
                }}
                pb={1}
              >
                <SyntaxHighlighter
                  children={code}
                  language={fixLanguageName(language)}
                  PreTag={(props) => (
                    <CodeHeader
                      {...props}
                      code={code}
                      language={language}
                      isLoading={isLoading}
                      onPrompt={onPrompt}
                    />
                  )}
                  style={style}
                  showLineNumbers={true}
                  showInlineLineNumbers={true}
                  wrapLines={true}
                  lineNumberStyle={{ WebkitUserSelect: "none" }}
                  lineProps={{
                    style: { display: "block" },
                  }}
                />
              </Box>
              {preview}
            </>
          );
        },
      }}
    />
  );
}

// Memoize to reduce re-renders/flickering when content hasn't changed
export default memo(Markdown);
