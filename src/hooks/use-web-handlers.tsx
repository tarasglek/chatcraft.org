import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type FC,
  type ReactNode,
} from "react";
import { useLocalStorage } from "react-use";

import {
  defaultWebHandlers,
  WebHandler,
  WebHandlers,
  webHandlersLocalStorageKey,
} from "../lib/WebHandler";

type WebHandlersContextType = {
  webHandlers: WebHandlers;
  registerHandlers: (newWebHandlers: WebHandlers) => void;
};

const WebHandlersContext = createContext<WebHandlersContextType>({
  webHandlers: defaultWebHandlers,
  registerHandlers: () => {
    /* do nothing */
  },
});

export const useWebHandlers = () => useContext(WebHandlersContext);

const serializer = (value: WebHandlers) => {
  const serializableHandlers = value.map((handler) => ({
    ...handler,
    matchPattern: handler.matchPattern.source,
  }));

  return JSON.stringify(serializableHandlers);
};

const deserializer = (value: string) => {
  // Get back the prototype methods
  const webHandlers = JSON.parse(value).map((handler: WebHandler) => new WebHandler(handler));

  return webHandlers;
};

export const WebHandlersProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [webHandlers, registerHandlers] = useLocalStorage<WebHandlers>(
    webHandlersLocalStorageKey,
    defaultWebHandlers,
    {
      raw: false,
      serializer,
      deserializer,
    }
  );

  const [state, setState] = useState<WebHandlers>(webHandlers || defaultWebHandlers);

  useEffect(() => {
    setState(webHandlers || defaultWebHandlers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateWebHandlers = useCallback(
    (newWebHandlers: WebHandlers) => {
      setState(newWebHandlers);
      registerHandlers(newWebHandlers);
    },
    [registerHandlers]
  );

  const value = { webHandlers: state, registerHandlers: updateWebHandlers };

  return <WebHandlersContext.Provider value={value}>{children}</WebHandlersContext.Provider>;
};
