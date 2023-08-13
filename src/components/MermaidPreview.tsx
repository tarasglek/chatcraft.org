import { memo, useCallback, useEffect, useRef } from "react";
import { Card, CardBody, IconButton, useClipboard } from "@chakra-ui/react";
import mermaid from "mermaid";
import { TbCopy } from "react-icons/tb";
import { nanoid } from "nanoid";
import { useAlert } from "../hooks/use-alert";

type MermaidPreviewProps = {
  children: React.ReactNode & React.ReactNode[];
};

const MermaidPreview = ({ children }: MermaidPreviewProps) => {
  const { onCopy, value, setValue } = useClipboard("");
  const { info } = useAlert();
  const diagramRef = useRef<HTMLDivElement | null>(null);
  const code = String(children);

  const handleCopy = useCallback(() => {
    onCopy();
    info({
      title: "Copied to Clipboard",
      message: "Mermaid SVG diagram was copied to your clipboard.",
    });
  }, [onCopy, info]);

  // Render the diagram as an SVG into our card's body
  useEffect(() => {
    const diagramDiv = diagramRef.current;
    if (!diagramDiv) {
      return;
    }

    const mermaidDiagramId = `mermaid-diagram-${nanoid().toLowerCase()}`;
    mermaid
      .render(mermaidDiagramId, code, diagramDiv)
      .then(({ svg, bindFunctions }) => {
        setValue(svg);
        diagramDiv.innerHTML = svg;
        bindFunctions?.(diagramDiv);
      })
      .catch((err) => {
        // When the diagram fails, use the error vs. diagram for copying (to debug)
        setValue(err);
        console.warn(`Error rendering mermaid diagram ${mermaidDiagramId}`, err);
      });
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
        <div ref={diagramRef} />
      </CardBody>
    </Card>
  );
};

// Memoize to reduce re-renders/flickering when content hasn't changed
export default memo(MermaidPreview);
