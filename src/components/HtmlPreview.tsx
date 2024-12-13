import { lazy, memo, useMemo, type ReactNode } from "react";
import { Card, CardBody, IconButton } from "@chakra-ui/react";
import { TbExternalLink } from "react-icons/tb";

const IframeResizer = lazy(() => import("@iframe-resizer/react"));

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
    scriptElement.src = new URL(
      "/node_modules/@iframe-resizer/child/index.umd.js",
      import.meta.url
    ).href;
    doc.body.appendChild(scriptElement);
    const html = `<!DOCTYPE html>${doc.documentElement.innerHTML}`;
    return toUrl(html);
  }, [children, isLoading]);

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
        _dark={{ color: "gray.300" }}
        variant="ghost"
      />
      <CardBody mt={10} p={2}>
        <IframeResizer
          license="GPLv3"
          checkOrigin={false}
          src={url}
          style={{ width: "1px", minWidth: "100%" }}
        />
      </CardBody>
    </Card>
  );
};

// Memoize to reduce re-renders/flickering when content hasn't changed
export default memo(HtmlPreview);
