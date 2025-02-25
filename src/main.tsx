// src/index.jsx
import { scan } from "react-scan"; // must be imported before React and React DOM
import React from "react";
import ReactDOM from "react-dom/client";
import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";
import { RouterProvider } from "react-router-dom";

import router from "./router";
import theme from "./theme";
import { SettingsProvider, useSettings } from "./hooks/use-settings";
import { UserProvider } from "./hooks/use-user";
import { ModelsProvider } from "./hooks/use-models";
import { CostProvider } from "./hooks/use-cost";
import { AudioPlayerProvider } from "./hooks/use-audio-player";
import { WebHandlersProvider } from "./hooks/use-web-handlers";
import { ChatProvider } from "./hooks/use-chat";

// need to import and call it
scan({
  enabled: false,
});

// enable perf profiling by typing in dev console: window.scan({enabled:true})
(globalThis.window as any).scan = scan;

ReactDOM.createRoot(document.querySelector("main") as HTMLElement).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <WebHandlersProvider>
        <AudioPlayerProvider>
          <SettingsProvider>
            <CostProvider>
              <ModelsProvider>
                <UserProvider>
                  <ChatProvider>
                    <ColorModeScript initialColorMode={theme.config.initialColorMode} />
                    <RouterProvider router={router} />
                  </ChatProvider>
                </UserProvider>
              </ModelsProvider>
            </CostProvider>
          </SettingsProvider>
        </AudioPlayerProvider>
      </WebHandlersProvider>
    </ChakraProvider>
  </React.StrictMode>
);
