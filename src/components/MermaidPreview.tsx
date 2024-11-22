import { memo, useCallback, useEffect, useRef, type ReactNode } from "react";
import { Card, IconButton, useClipboard } from "@chakra-ui/react";
import mermaid from "mermaid";
import { TbCopy } from "react-icons/tb";
import { nanoid } from "nanoid";
import { useAlert } from "../hooks/use-alert";

type MermaidPreviewProps = {
  children: ReactNode & ReactNode[];
};

const MermaidPreview = ({ children }: MermaidPreviewProps) => {
  const { copy: onCopy, value, setValue } = useClipboard();
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
    <Card.Root variant="outline" position="relative" mt={2} minHeight="12em" resize="vertical">
      <IconButton
        position="absolute"
        right={1}
        top={1}
        zIndex={50}
        aria-label="Copy Diagram to Clipboard"
        title="Copy Diagram to Clipboard"
        color="gray.600"
        _dark={{ color: "gray.300" }}
        variant="ghost"
        onClick={() => handleCopy()}
        disabled={!value}
      >
        <TbCopy />
      </IconButton>
      <Card.Body p={2}>
        <div ref={diagramRef} />
      </Card.Body>
    </Card.Root>
  );
};

// Memoize to reduce re-renders/flickering when content hasn't changed
export default memo(MermaidPreview);
