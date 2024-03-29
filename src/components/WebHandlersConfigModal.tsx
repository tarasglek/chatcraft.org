import {
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { ChangeEvent, RefObject, useCallback, useState } from "react";

import { MdSave } from "react-icons/md";
import YAML from "yaml";
import { useWebHandlers } from "../hooks/use-web-handlers";
import { WebHandler, WebHandlers } from "../lib/WebHandler";
import { useAlert } from "../hooks/use-alert";

type WebHandlersConfigModalProps = {
  isOpen: boolean;
  onClose: () => void;
  finalFocusRef?: RefObject<HTMLTextAreaElement>;
};

function WebHandlersConfigModal({ isOpen, onClose, finalFocusRef }: WebHandlersConfigModalProps) {
  const { webHandlers, registerHandlers } = useWebHandlers();
  const { info, error } = useAlert();

  const getWebHandlersYaml = (webHandlers: WebHandlers) => {
    return YAML.stringify(
      webHandlers.map((handler) => ({ ...handler, matchPattern: handler.matchPattern.source }))
    );
  };

  const [webHandlerConfig, setWebHandlerConfig] = useState(getWebHandlersYaml(webHandlers));

  const handleConfigValueChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const updatedConfig = event.target.value;

      setWebHandlerConfig(updatedConfig);
    },
    [setWebHandlerConfig]
  );

  const onModalClose = useCallback(() => {
    // Reset any unsaved changes
    setWebHandlerConfig(getWebHandlersYaml(webHandlers));

    // Close the modal
    onClose();
  }, [onClose, webHandlers]);

  const onSaveConfig = useCallback(() => {
    try {
      const updatedWebHandlers: WebHandlers = YAML.parse(webHandlerConfig).map(
        (handlerConfig: WebHandler) => new WebHandler(handlerConfig)
      );

      if (updatedWebHandlers.some((handler) => !handler.isValidHandler())) {
        throw new Error("Invalid Handler Configuration");
      }

      // Persist handlers to local storage
      registerHandlers(updatedWebHandlers);

      info({
        title: "Saved",
        message: "Successfully updated Web Handlers configuration",
      });
    } catch (err: any) {
      error({
        title: "Failed to save Handler Config",
        message: "Please enter valid YAML configuration",
      });
    }
  }, [error, info, registerHandlers, webHandlerConfig]);

  return (
    <Modal isOpen={isOpen} onClose={onModalClose} size="lg" finalFocusRef={finalFocusRef}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Web Handlers</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack gap={4}>
            <FormControl>
              <FormLabel>Register Handlers</FormLabel>
              <Textarea
                value={webHandlerConfig}
                onChange={handleConfigValueChange}
                height={200}
                placeholder="Please enter the configurations of your handlers in YAML"
              />

              <FormHelperText>
                The first handler with a successful match pattern is executed
              </FormHelperText>
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button size="sm" rightIcon={<MdSave />} onClick={onSaveConfig}>
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default WebHandlersConfigModal;
