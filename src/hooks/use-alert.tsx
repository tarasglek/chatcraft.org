import { toaster } from "../components/ui/toaster";
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
  if (!message) return "";
  return message.length > 200 ? `${message.substring(0, 200)}...` : message;
}

// Keep track of open error toasts
const openErrorToasts: string[] = [];

export function useAlert() {
  const isMobile = useMobileBreakpoint();

  const info = useCallback(({ id, title, message }: AlertArguments) => {
    toaster.create({
      id,
      description: truncateMessage(message),
      title,
      type: "info",
    });
  }, []);

  const error = useCallback(
    ({ id, title, message }: AlertArguments) => {
      // Close any open error toasts
      openErrorToasts.forEach((toastId) => toaster.dismiss(toastId));

      const newToastId: string | undefined = toaster.create({
        id,
        title,
        description: truncateMessage(message),
        type: "error",
        // Don't auto-close errors
        action: {
          label: "Close",
          onClick: () => toaster.dismiss(newToastId),
        },
      });

      // Keep track of open error toasts
      openErrorToasts.push(newToastId ? newToastId : "");
      return newToastId;
    },
    [isMobile]
  );

  const success = useCallback(({ id, title, message }: AlertArguments) => {
    toaster.create({
      id,
      description: truncateMessage(message),
      title,
      type: "success",
    });
  }, []);

  const warning = useCallback(({ id, title, message }: AlertArguments) => {
    toaster.create({
      id,
      description: truncateMessage(message),
      title,
      type: "warning",
    });
  }, []);

  type ProgressAlertArguements = Omit<AlertArguments, "id"> & {
    id?: string;
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
      const toastOptions: any = {
        id,
        status: "loading",
        position: "top",
        isClosable: isClosable,
        duration: null,
        render: ({ onClose }: { onClose: () => void }) => {
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
            />
          );
        },
      };

      if (id && updateOnly) {
        toaster.update(toastOptions, {
          id: id,
        });
      } else {
        toaster.create(toastOptions);
      }
    },
    []
  );

  const closeToast = useCallback((toastId?: string) => {
    if (toastId) toaster.dismiss(toastId);
  }, []);

  return {
    info,
    error,
    success,
    warning,
    progress,
    closeToast,
  };
}
