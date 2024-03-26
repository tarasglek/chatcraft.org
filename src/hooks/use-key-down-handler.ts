import { useCallback, KeyboardEvent } from "react";
import { isMac, isWindows } from "../lib/utils";

type KeyboardEventHandlers<T> = {
  onMetaEnter?: (e: KeyboardEvent<T>) => void;
  onEscape?: (e: KeyboardEvent<T>) => void;
  onForwardSlash?: (e: KeyboardEvent<T>) => void;
};

export function useKeyDownHandler<T>({
  onMetaEnter,
  onEscape,
  onForwardSlash,
}: KeyboardEventHandlers<T>) {
  return useCallback(
    (e: KeyboardEvent<T>) => {
      if (
        onMetaEnter &&
        ((isMac() && e.metaKey) || (isWindows() && e.ctrlKey)) &&
        (e.key === "Enter" || e.key === "NumpadEnter")
      ) {
        onMetaEnter(e);
      }
      if (onEscape && e.key === "Escape") {
        onEscape(e);
      }
      if (onForwardSlash && e.key === "/") {
        onForwardSlash(e);
      }
    },
    [onMetaEnter, onEscape, onForwardSlash]
  );
}
