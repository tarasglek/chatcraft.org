import { useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface MarkdownWithMermaidProps {
    children: string;
}

export const MarkdownWithMermaid: React.FC<MarkdownWithMermaidProps> = ({ children }) => {
  useEffect(() => {
    let mermaid = (window as any).mermaid
    if (mermaid) {
      mermaid.contentLoaded();
    }
  })
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