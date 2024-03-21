import { useRef, type ReactNode, useCallback, useEffect } from "react";
import nomnoml from "nomnoml";
import { useClipboard } from "@chakra-ui/react";
import { useAlert } from "../hooks/use-alert";
import { nanoid } from "nanoid";

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
  });
};

// Memoize to reduce re-renders/flickering when content hasn't changed
export default memo(NomnomlPreview);
