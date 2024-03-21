import { memo, useCallback, useEffect, useRef, type ReactNode } from "react";
import { Card, CardBody, IconButton, useClipboard } from "@chakra-ui/react";
import nomnoml from "nomnoml";
import { TbCopy } from "react-icons/tb";
import { nanoid } from "nanoid";
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
  });
};

// Memoize to reduce re-renders/flickering when content hasn't changed
export default memo(NomnomlPreview);
