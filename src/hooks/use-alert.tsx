import { ToastId, UseToastOptions, useToast } from "@chakra-ui/react";
import { useCallback } from "react";
import ProgressToast from "../components/ProgressToast";
import useMobileBreakpoint from "./use-mobile-breakpoint";

export type AlertArguments = {
  // Use `id` if you want to avoid duplicate alerts showing
  id?: string;
  title: string;
  message?: string;
};

function truncateMessage(message?: string): string {
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
  const isMobile = useMobileBreakpoint();

  const info = useCallback(
    ({ id, title, message }: AlertArguments) =>
      toast({
        id,
        title,
        description: truncateMessage(message),
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
        description: truncateMessage(message),
        status: "error",
        position: "top",
        isClosable: true,
        // Don't auto-close errors
        duration: null,
        containerStyle: {
          width: isMobile ? "90vw" : "initial",
        },
      }),
    [toast, isMobile]
  );

  const success = useCallback(
    ({ id, title, message }: AlertArguments) =>
      toast({
        id,
        title,
        description: truncateMessage(message),
        status: "success",
        position: "top",
        isClosable: true,
        duration: 2000,
      }),
    [toast]
  );

  const warning = useCallback(
    ({ id, title, message }: AlertArguments) =>
      toast({
        id,
        title,
        description: truncateMessage(message),
        status: "warning",
        position: "top",
        isClosable: true,
        duration: 3000,
      }),
    [toast]
  );

  type ProgressAlertArguements = Omit<AlertArguments, "id"> & {
    id?: ToastId;
    progressPercentage: number;
    updateOnly?: boolean;
    showPercentage?: boolean;
    isClosable?: boolean;
    handleClose?: () => void;
  };

  const progress = useCallback(
    ({
      id,
      title,
      message,
      progressPercentage,
      updateOnly = false,
      showPercentage = true,
      isClosable = true,
      handleClose,
    }: ProgressAlertArguements) => {
      const toastOptions: UseToastOptions = {
        status: "loading",
        position: "top",
        isClosable: isClosable,
        duration: null,
        render: ({ onClose }) => {
          const closeHandler = () => {
            handleClose?.();
            onClose();
          };

          return (
            <ProgressToast
              title={title}
              message={message}
              progressPercentage={progressPercentage}
              showPercentage={showPercentage}
              onClose={isClosable ? closeHandler : undefined}
            ></ProgressToast>
          );
        },
      };

      if (id) {
        if (toast.isActive(id)) {
          toast.update(id, toastOptions);
        }
      } else if (!updateOnly) {
        return toast({
          ...toastOptions,
        });
      }
    },
    [toast]
  );

  const closeToast = useCallback(
    (toastId?: ToastId) => {
      if (toastId) {
        toast.close(toastId);
      }
    },
    [toast]
  );

  return {
    info,
    error,
    success,
    warning,
    progress,
    closeToast,
  };
}
