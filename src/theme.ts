import { createSystem, defineConfig } from "@chakra-ui/react";

const theme = defineConfig({
  theme: {
    tokens: {
      colors: {},
    },
  },
});

const systemCustom = createSystem(theme);

export default systemCustom;
