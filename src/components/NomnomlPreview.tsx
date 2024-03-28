import { memo, useCallback, useEffect, useRef, type ReactNode } from "react";
import { Card, CardBody, IconButton, useClipboard } from "@chakra-ui/react";
import { TbCopy } from "react-icons/tb";
import { useAlert } from "../hooks/use-alert";

type NomnomlPreviewProps = {
  children: ReactNode & ReactNode[];
};

const NomnomlPreview = ({ children }: NomnomlPreviewProps) => {
  const { onCopy, value, setValue } = useClipboard("");
  const { info } = useAlert();
  const diagramRef = useRef<HTMLDivElement | null>(null);
  const code = String(children);

  const handleCopy = useCallback(() => {
    onCopy();
    info({
      title: "Copied to Clipboard",
      message: "Nomnoml SVG diagram was copied to your clipboard.",
    });
  }, [onCopy, info]);

  // Render the diagram as an SVG into our card's body
  useEffect(() => {
    const diagramDiv = diagramRef.current;
    if (!diagramDiv) {
      return;
    }

    const fetchNomnoml = async () => {
      try {
        // Load nomnoml dynamically at runtime if needed
        const nomnoml = await import("nomnoml");
        const svg = await nomnoml.renderSvg(code);

        setValue(svg);

        // Render nomnoml svg if successful
        diagramDiv.innerHTML = svg;

        // Adjust the width of the SVG to fit the content inside the CardBody
        const svgElement = diagramDiv.querySelector("svg");
        if (svgElement) {
          svgElement.style.width = "100%";
        }
      } catch (err: any) {
        // When the diagram fails, use the error vs. diagram for copying (to debug)
        setValue(err);

        // Render custom error message instead of error or blank content
        const errMessage = `Error rendering Nomnoml diagram`;
        diagramDiv.innerHTML = errMessage;
        console.warn(`Error rendering nomnoml diagram`, err);
      }
    };
    fetchNomnoml();
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
export default memo(NomnomlPreview);
