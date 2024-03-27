import { useCallback } from "react";
import { useToast } from "@chakra-ui/react";

type AlertArguments = {
  // Use `id` if you want to avoid duplicate alerts showing
  id?: string;
  title: string;
  message?: string;
};

function trimMessage(message?: string): string {
  if (!message) {
    return "";
  }

  if (message.length > 200) {
    return `${message.substring(0, 200)}...`;
  }

  return message;
}

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

  const success = useCallback(
    ({ id, title, message }: AlertArguments) =>
      toast({
        id,
        title,
        description: trimMessage(message),
        status: "success",
        position: "top",
        isClosable: true,
        duration: 1000,
      }),
    [toast]
  );

  const warning = useCallback(
    ({ id, title, message }: AlertArguments) =>
      toast({
        id,
        title,
        description: trimMessage(message),
        status: "warning",
        position: "top",
        isClosable: true,
        duration: 1000,
      }),
    [toast]
  );

  return {
    info,
    error,
    success,
    warning,
  };
}
