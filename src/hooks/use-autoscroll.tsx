import {
  useState,
  createContext,
  useContext,
  useRef,
  type ReactNode,
  type RefObject,
  type FC,
} from "react";

type AutoScrollContextType = {
  // When streaming, and scrolling is happening, scrollProgress increases.
  // Reset back to 0 when not streaming/scrolling.
  scrollProgress: number;
  incrementScrollProgress: () => void;
  resetScrollProgress: () => void;
  scrollBottomRef: RefObject<HTMLDivElement>;
  shouldAutoScroll: boolean;
  setShouldAutoScroll: (value: boolean) => void;
};

const AutoScrollContext = createContext<AutoScrollContextType>({
  scrollProgress: 0,
  incrementScrollProgress: () => {
    /* do nothing */
  },
  resetScrollProgress: () => {
    /* do nothing */
  },
  scrollBottomRef: { current: null },
  shouldAutoScroll: false,
  setShouldAutoScroll: () => {
    /* do nothing */
  },
});

export const useAutoScroll = () => useContext(AutoScrollContext);

export const AutoScrollProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(false);
  const scrollBottomRef = useRef<HTMLDivElement>(null);

  const value = {
    scrollProgress,
    incrementScrollProgress() {
      setScrollProgress((currentValue) => currentValue + 1);
    },
    resetScrollProgress() {
      setScrollProgress(0);
    },
    scrollBottomRef,
    shouldAutoScroll,
    setShouldAutoScroll,
  };
  return <AutoScrollContext.Provider value={value}>{children}</AutoScrollContext.Provider>;
};
