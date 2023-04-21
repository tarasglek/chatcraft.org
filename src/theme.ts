import { extendTheme, withDefaultColorScheme } from "@chakra-ui/react";

const theme = extendTheme(
  {
    config: {
      // Initialize dark/light mode with system pref, but remember choice
      // via localStorage setting
      initialColorMode: "system",
      useSystemColorMode: false,
    },
    // Style the root elements for full viewport sizing
    styles: {
      global: {
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
    },
  },
  // Default to a blue color scheme, but lots of others are possible
  // https://chakra-ui.com/docs/styled-system/theme#colors
  withDefaultColorScheme({ colorScheme: "blue" })
);

export default theme;
