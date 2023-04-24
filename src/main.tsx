import React from "react";
import ReactDOM from "react-dom/client";
import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";

import App from "./App";
import theme from "./theme";
import { SettingsProvider } from "./hooks/use-settings";

ReactDOM.createRoot(document.querySelector("main") as HTMLElement).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <SettingsProvider>
        <ColorModeScript initialColorMode={theme.config.initialColorMode} />
        <App />
      </SettingsProvider>
    </ChakraProvider>
  </React.StrictMode>
);
