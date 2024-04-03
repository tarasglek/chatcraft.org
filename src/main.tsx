import React from "react";
import ReactDOM from "react-dom/client";
import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";
import { RouterProvider } from "react-router-dom";

import router from "./router";
import theme from "./theme";
import { SettingsProvider } from "./hooks/use-settings";
import { UserProvider } from "./hooks/use-user";
import { ModelsProvider } from "./hooks/use-models";
import { CostProvider } from "./hooks/use-cost";
import { AudioPlayerProvider } from "./hooks/use-audio-player";
import { WebHandlersProvider } from "./hooks/use-web-handlers";

ReactDOM.createRoot(document.querySelector("main") as HTMLElement).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <WebHandlersProvider>
        <AudioPlayerProvider>
          <SettingsProvider>
            <CostProvider>
              <ModelsProvider>
                <UserProvider>
                  <ColorModeScript initialColorMode={theme.config.initialColorMode} />
                  <RouterProvider router={router} />
                </UserProvider>
              </ModelsProvider>
            </CostProvider>
          </SettingsProvider>
        </AudioPlayerProvider>
      </WebHandlersProvider>
    </ChakraProvider>
  </React.StrictMode>
);
