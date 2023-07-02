import { useCallback, createContext, useContext, type ReactNode, type FC } from "react";
import { useSessionStorage } from "react-use";

type CostContextType = {
  cost: number;
  incrementCost: (amount: number) => void;
};

const CostContext = createContext<CostContextType>({
  cost: 0,
  incrementCost: () => {
    /* do nothing */
  },
});

export const useCost = () => useContext(CostContext);

export const CostProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [cost, setCost] = useSessionStorage<number>("cost", 0);

  const incrementCost = useCallback(
    (amount: number) => {
      setCost(cost + amount);
    },
    [cost, setCost]
  );

  const value = { cost, incrementCost };

  return <CostContext.Provider value={value}>{children}</CostContext.Provider>;
};
