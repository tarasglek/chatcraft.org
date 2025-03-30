import {
  useCallback,
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
  type FC,
} from "react";
import { useSessionStorage } from "react-use";

type CostContextType = {
  cost: number;
  incrementCost: (amount: number) => void;
  credit: number | null;
  fetchCredit: () => void;
};

const CostContext = createContext<CostContextType>({
  cost: 0,
  incrementCost: () => {
    /* do nothing */
  },
  credit: null,
  fetchCredit: () => {
    /* do nothing */
  },
});

export const useCost = () => useContext(CostContext);

export const CostProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [cost, setCost] = useSessionStorage<number>("cost", 0);
  const [localCost, setLocalCost] = useState<number>(cost);
  const [credit, setCredit] = useState<number | null>(null);
  const [initialLoad, setInitialLoad] = useState<boolean>(true);
  useEffect(() => {
    setCost(localCost);
  }, [localCost, setCost]);

  const incrementCost = useCallback(
    (amount: number) => {
      setLocalCost((prevCost: number) => prevCost + amount);
    },
    [setLocalCost]
  );

  const fetchCredit = useCallback(async () => {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/auth/key", {
        headers: {
          Authorization: `Bearer APIKey`,
        },
      });
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await response.json();
      console.log(data);

      const limitRemaining = parseFloat(data.data.limit_remaining);
      if (isNaN(limitRemaining)) {
        throw new Error("limit_remaining is not a valid number");
      }
      setCredit(data.data.limit);
      if (!initialLoad) {
        setLocalCost((prevCost) => prevCost + limitRemaining);
      }
      setInitialLoad(false);
    } catch (error) {
      console.error("Failed to fetch credit", error);
    }
  }, []);

  useEffect(() => {
    fetchCredit();
  }, [fetchCredit]);

  const value = { cost: localCost, incrementCost, credit, fetchCredit };

  return <CostContext.Provider value={value}>{children}</CostContext.Provider>;
};
