import { type ReactNode } from "react";
import nomnoml from "nomnoml";

type NomnomlPreviewProps = {
  children: ReactNode & ReactNode[];
};

const NomnomlPreview = ({ children }: NomnomlPreviewProps) => {
  const code = String(children);
};

// Memoize to reduce re-renders/flickering when content hasn't changed
export default memo(NomnomlPreview);
