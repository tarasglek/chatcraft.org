import { memo, useMemo, type ReactNode } from "react";
import { Card, CardBody, IconButton } from "@chakra-ui/react";
import { TbExternalLink } from "react-icons/tb";
import IframeResizer from "iframe-resizer-react";

type HtmlPreviewProps = {
  children: ReactNode & ReactNode[];
};

const toUrl = (html: string) => URL.createObjectURL(new Blob([html], { type: "text/html" }));

const HtmlPreview = ({ children }: HtmlPreviewProps) => {
  const url = useMemo(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(children), "text/html");
    const scriptElement = document.createElement("script");
    scriptElement.src = new URL("/js/iframeResizer.contentWindow.min.js", import.meta.url).href;
    doc.body.appendChild(scriptElement);
    const HtmlContent = `<!DOCTYPE html>${doc.documentElement.innerHTML}`;
    return toUrl(HtmlContent);
  }, [children]);

  return (
    <Card variant="outline" position="relative" mt={2} minHeight="12em" resize="vertical">
      <IconButton
        position="absolute"
        right={1}
        top={1}
        zIndex={50}
        as="a"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open HTML Preview in New Window"
        title="Open HTML Preview in New Window"
        icon={<TbExternalLink />}
        color="gray.600"
        variant="ghost"
      />
      <CardBody mt={6} p={2}>
        <IframeResizer
          checkOrigin={false}
          src={url}
          style={{ width: "1px", minWidth: "100%" }}
          scrolling={true}
        />
      </CardBody>
    </Card>
  );
};

// Memoize to reduce re-renders/flickering when content hasn't changed
export default memo(HtmlPreview);
