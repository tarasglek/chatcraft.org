import { useCallback, KeyboardEvent } from "react";
import { isMac, isWindows } from "../lib/utils";

type KeyboardEventHandlers<T> = {
  onMetaEnter?: (e: KeyboardEvent<T>) => void;
  onEscape?: (e: KeyboardEvent<T>) => void;
};

export function useKeyDownHandler<T>({ onMetaEnter, onEscape }: KeyboardEventHandlers<T>) {
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
    },
    [onMetaEnter, onEscape]
  );
}
