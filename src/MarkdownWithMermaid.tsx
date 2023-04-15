import { useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface MarkdownWithMermaidProps {
    children: string;
}

function lazyLoadMermaidAndRenderThem() {
  const scriptTags = document.getElementsByTagName('script');
  const mermaid_js = 'mermaid.min.js';
  for (let i = 0; i < scriptTags.length; i++) {
    const scriptTag = scriptTags[i];
    const src = scriptTag.getAttribute('src');
    if (src && src.includes(mermaid_js)) {
      let mermaid = (window as any).mermaid;
      console.log("found mermaid script tag")
      if (mermaid) {
        mermaid.contentLoaded();
        console.log("mermaid contentLoaded()")
      }
      return
    }
  }
  const scriptTag = document.createElement('script');
  scriptTag.src = mermaid_js
  scriptTag.onload = lazyLoadMermaidAndRenderThem;
  document.body.appendChild(scriptTag);
  console.log("mermaid script tag appended")
}

export const MarkdownWithMermaid: React.FC<MarkdownWithMermaidProps> = ({ children }) => {
  return (
    // <ReactMarkdown linkTarget={"_blank"} children={children}/>
    <ReactMarkdown
    children={children}
    components={{
      code({node, inline, className, children, ...props}) {
        const match = /language-(\w+)/.exec(className || '');
        let code = (
          <code className={className} {...props}>
          {children}
          </code>
        )
        if (match) {
          if (match[1] === 'mermaid') {
            useEffect(() => {
              lazyLoadMermaidAndRenderThem()
            })
            return (
              <>
              <div className="mermaid">
              { children }
              </div>
              {code}
              </>
              )
            }
          }
        return code
      }
    }}
  />
  )
};