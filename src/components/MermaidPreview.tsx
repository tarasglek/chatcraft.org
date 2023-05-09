import { useEffect, useRef } from "react";
import { Card, CardBody, IconButton, useClipboard, useToast } from "@chakra-ui/react";
import mermaid from "mermaid";
import { TbCopy } from "react-icons/tb";

import { unique } from "../utils";

type MermaidPreviewProps = {
  children: React.ReactNode & React.ReactNode[];
};

const MermaidPreview = ({ children }: MermaidPreviewProps) => {
  const { onCopy, value, setValue } = useClipboard("");
  const toast = useToast();
  const diagramRef = useRef<HTMLDivElement | null>(null);
  const code = String(children);

  const handleCopy = () => {
    onCopy();
    toast({
      title: "Copied to Clipboard",
      description: "Mermaid SVG diagram was copied to your clipboard.",
      status: "info",
      duration: 3000,
      position: "top",
      isClosable: true,
    });
  };

  // Render the diagram as an SVG into our card's body
  useEffect(() => {
    const diagramDiv = diagramRef.current;
    if (!diagramDiv) {
      return;
    }

    const renderDiagram = () => {
      const mermaidDiagramId = `mermaid-diagram-${unique()}`;
      mermaid
        .render(mermaidDiagramId, code, diagramDiv)
        .then(({ svg }) => {
          setValue(svg);
        })
        .catch((err) => console.warn(`Error rendering mermaid diagram ${mermaidDiagramId}`, err));
    };

    // HACK: can't figure out how to eliminate the need for this timeout
    const timeoutId = setTimeout(renderDiagram, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [diagramRef, code, setValue]);

  return (
    <Card variant="outline" position="relative" mt={2} minHeight="12em" resize="vertical">
      <IconButton
        position="absolute"
        right={1}
        top={1}
        zIndex={50}
        aria-label="Copy Diagram to Clipboard"
        title="Copy Diagram to Clipboard"
        icon={<TbCopy />}
        color="gray.600"
        _dark={{ color: "gray.300" }}
        variant="ghost"
        onClick={() => handleCopy()}
        isDisabled={!value}
      />

      <CardBody p={2}>
        <div ref={diagramRef} dangerouslySetInnerHTML={{ __html: value }} />
      </CardBody>
    </Card>
  );
};

export default MermaidPreview;
