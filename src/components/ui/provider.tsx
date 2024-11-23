"use client";
import { Toaster } from "../../components/ui/toaster";
import systemCustom from "../../theme";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { ColorModeProvider, type ColorModeProviderProps } from "./color-mode";

export function Provider(props: ColorModeProviderProps) {
  return (
    <ChakraProvider value={defaultSystem}>
      <Toaster />
      <ColorModeProvider {...props} />
    </ChakraProvider>
  );
}
