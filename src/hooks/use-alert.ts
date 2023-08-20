import { useCallback } from "react";
import { useToast } from "@chakra-ui/react";

type AlertArguments = {
  // Use `id` if you want to avoid duplicate alerts showing
  id?: string;
  title: string;
  message?: string;
};

export function useAlert() {
  const toast = useToast();

  const info = useCallback(
    ({ id, title, message }: AlertArguments) =>
      toast({
        id,
        title,
        description: message,
        colorScheme: "blue",
        status: "success",
        position: "top",
        isClosable: true,
        duration: 3000,
      }),
    [toast]
  );

  const error = useCallback(
    ({ id, title, message }: AlertArguments) =>
      toast({
        id,
        title,
        description: message,
        status: "error",
        position: "top",
        isClosable: true,
        // Don't auto-close errors
        duration: null,
      }),
    [toast]
  );

  return {
    info,
    error,
  };
}
