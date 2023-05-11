import { memo, useMemo } from "react";
import { chakra, Card, CardBody, IconButton } from "@chakra-ui/react";
import { TbExternalLink } from "react-icons/tb";

type HtmlPreviewProps = {
  children: React.ReactNode & React.ReactNode[];
};

const toUrl = (html: string) => URL.createObjectURL(new Blob([html], { type: "text/html" }));

const HtmlPreview = ({ children }: HtmlPreviewProps) => {
  const url = useMemo(() => toUrl(String(children)), [children]);

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
      <CardBody p={2}>
        <chakra.iframe w="100%" minHeight="200px" frameBorder="0" src={url}></chakra.iframe>
      </CardBody>
    </Card>
  );
};

// Memoize to reduce re-renders/flickering when content hasn't changed
export default memo(HtmlPreview);
