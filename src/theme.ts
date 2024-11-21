import { createSystem, defaultConfig } from "@chakra-ui/react";

const theme = createSystem(
  defaultConfig,
  {
    // Style the root elements for full viewport sizing
    globalCss: {
      html: {
        height: "100%",
      },
      body: {
        height: "100%",
      },
      main: {
        height: "100%",
        overflow: "hidden",
      },
    },
  }
  // Default to a blue color scheme, but lots of others are possible
  // https://chakra-ui.com/docs/styled-system/theme#colors
  //withDefaultColorScheme({ colorScheme: "blue" })
);

export default theme;
