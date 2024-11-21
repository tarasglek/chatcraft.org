import { lazy, memo, useMemo, type ReactNode } from "react";
import { CardRoot, CardBody, IconButton } from "@chakra-ui/react";
import { TbExternalLink } from "react-icons/tb";
import { LinkButton } from "./ui/link-button";

const IframeResizer = lazy(() => import("iframe-resizer-react"));

type HtmlPreviewProps = {
  children: ReactNode & ReactNode[];
  isLoading: boolean;
};

const toUrl = (html: string) => URL.createObjectURL(new Blob([html], { type: "text/html" }));

const HtmlPreview = ({ children, isLoading = false }: HtmlPreviewProps) => {
  const url = useMemo(() => {
    if (isLoading) {
      return "about:blank";
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(children), "text/html");
    const scriptElement = document.createElement("script");
    scriptElement.src = new URL("/js/iframeResizer.contentWindow.min.js", import.meta.url).href;
    doc.body.appendChild(scriptElement);
    const html = `<!DOCTYPE html>${doc.documentElement.innerHTML}`;
    return toUrl(html);
  }, [children, isLoading]);

  return (
    <CardRoot variant="outline" position="relative" mt={2} minHeight="12em" resize="vertical">
      <LinkButton
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
        color="gray.600"
        _dark={{ color: "gray.300" }}
        variant="ghost"
      >
        <IconButton as={TbExternalLink} />
      </LinkButton>

      <CardBody mt={10} p={2}>
        <IframeResizer
          checkOrigin={false}
          src={url}
          style={{ width: "1px", minWidth: "100%" }}
          heightCalculationMethod={"max"}
        />
      </CardBody>
    </CardRoot>
  );
};

// Memoize to reduce re-renders/flickering when content hasn't changed
export default memo(HtmlPreview);
