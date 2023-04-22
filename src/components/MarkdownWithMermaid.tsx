// TODO: switch to using proper React components for this...
// import ReactMarkdown from "react-markdown";
// import remarkMermaid from "remark-mermaidjs";

// interface MarkdownWithMermaidProps {
//   children: string;
// }

// const MarkdownWithMermaid = ({ children }: MarkdownWithMermaidProps) => {
//   return <ReactMarkdown children={children} remarkPlugins={[remarkMermaid]} />;
// };

// export default MarkdownWithMermaid;

import { useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface MarkdownWithMermaidProps {
  children: string;
}

function lazyLoadMermaidAndRenderThem() {
  const scriptTags = document.getElementsByTagName("script");
  const mermaid_js = "mermaid.min.js";
  for (let i = 0; i < scriptTags.length; i++) {
    const scriptTag = scriptTags[i];
    const src = scriptTag.getAttribute("src");
    if (src && src.includes(mermaid_js)) {
      let mermaid = (window as any).mermaid;
      // console.log("found mermaid script tag")
      if (mermaid) {
        mermaid.contentLoaded();
        // console.log("mermaid contentLoaded()")
      }
      return;
    }
  }
  const scriptTag = document.createElement("script");
  scriptTag.src = mermaid_js;
  scriptTag.onload = lazyLoadMermaidAndRenderThem;
  document.body.appendChild(scriptTag);
  // console.log("mermaid script tag appended")
}

export const MarkdownWithMermaid: React.FC<MarkdownWithMermaidProps> = ({ children }) => {
  return (
    <ReactMarkdown
      className="message-text"
      children={children}
      components={{
        code({ node, inline, className, children, ...props }) {
          let prefix = <></>;
          if (className === "language-mermaid") {
            useEffect(() => {
              lazyLoadMermaidAndRenderThem();
            });
            prefix = <div className="mermaid">{children}</div>;
          } else if (className === "language-html") {
            prefix = <iframe className="htmlPreview" srcDoc={children as any}></iframe>;
          }
          return (
            <>
              {prefix}
              <code className={className} {...props}>
                {children}
              </code>
            </>
          );
        },
      }}
    />
  );
};

export default MarkdownWithMermaid;
