import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Switch,
  Text,
  VStack,
  useColorMode,
} from "@chakra-ui/react";
import { RefObject, useCallback, useEffect, useState } from "react";

import ReactCodeMirror from "@uiw/react-codemirror";
import { MdSave } from "react-icons/md";
import YAML from "yaml";
import { useAlert } from "../hooks/use-alert";
import { useWebHandlers } from "../hooks/use-web-handlers";
import { WebHandler, WebHandlers } from "../lib/WebHandler";
import CodeHeader from "./CodeHeader";

import { yaml } from "@codemirror/lang-yaml";
import { MdSignalCellularAlt } from "react-icons/md";

type WebHandlersConfigModalProps = {
  isOpen: boolean;
  onClose: () => void;
  finalFocusRef?: RefObject<HTMLTextAreaElement>;
};

function WebHandlersConfigModal({ isOpen, onClose, finalFocusRef }: WebHandlersConfigModalProps) {
  const { webHandlers, registerHandlers } = useWebHandlers();
  const { success, error } = useAlert();
  const [showInstructions, setShowInstructions] = useState(true);

  const getWebHandlersYaml = useCallback(
    (webHandlers: WebHandlers) => {
      const onBoardingInstructions = `##############################################################################
## You can configure "match patterns" for certain types
## of URLs, that send an HTTP request to your
## configured "handler url".
## Various options can be set to customize the
## the type of request that is sent.
##
## Supported Options
##
## - handlerUrl:   The web url of the service,
##                 you want to send a request to.
##                 e.g. 'https://taras-scrape2md.web.val.run/'
##   method:       The HTTP method type of the request
##                 to be sent.
##   matchPattern: A regular expression to execute the web handler,
##                 if the your prompt text is a match.
##                 The match patterns are evaluated in the order
##                 of your Web Handler definitions.
##############################################################################`;

      return `${showInstructions ? `${onBoardingInstructions}\n\n` : ""}${YAML.stringify(
        webHandlers.map((handler) => ({ ...handler, matchPattern: handler.matchPattern.source }))
      )}`;
    },
    [showInstructions]
  );

  const [webHandlerConfig, setWebHandlerConfig] = useState(getWebHandlersYaml(webHandlers));

  useEffect(() => {
    setWebHandlerConfig(getWebHandlersYaml(webHandlers));
  }, [getWebHandlersYaml, webHandlers]);

  const handleConfigValueChange = useCallback(
    (updatedConfig: string) => {
      setWebHandlerConfig(updatedConfig);
    },
    [setWebHandlerConfig]
  );

  const onModalClose = useCallback(() => {
    // Reset any unsaved changes
    setWebHandlerConfig(getWebHandlersYaml(webHandlers));

    // Close the modal
    onClose();
  }, [getWebHandlersYaml, onClose, webHandlers]);

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

      success({
        title: "Saved",
        message: "Successfully updated Web Handlers configuration",
      });
    } catch (err: any) {
      error({
        title: "Failed to save Handler Config",
        message: "Please enter valid YAML configuration",
      });
    }
  }, [error, registerHandlers, success, webHandlerConfig]);

  const configDownloadFilename = "WebHandlersConfig.yaml";
  const { colorMode } = useColorMode();
  const editorHeight = "350px";

  return (
    <Modal isOpen={isOpen} onClose={onModalClose} size="2xl" finalFocusRef={finalFocusRef}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader display={"flex"} alignItems={"center"} gap={2}>
          Web Handlers <MdSignalCellularAlt />
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack gap={4}>
            <Text>
              {/* eslint-disable-next-line react/no-unescaped-entities */}
              If you want to extend ChatCraft's functionality by plugging external services your own
              services, you are at the right place 😎
            </Text>

            <Flex
              width={"100%"}
              justifyContent={"space-between"}
              alignItems={"center"}
              wrap={"wrap"}
              gap={2}
            >
              <Heading size={"md"} alignSelf={"start"} fontWeight={"normal"} flexGrow={1}>
                Register Handlers
              </Heading>

              <FormControl display="flex" alignItems="center" width={"auto"}>
                <FormLabel htmlFor="show-instructions-switch" mb="0">
                  Show Instructions?
                </FormLabel>
                <Switch
                  id="show-instructions-switch"
                  isChecked={showInstructions}
                  onChange={() => setShowInstructions((prevValue) => !prevValue)}
                />
              </FormControl>
            </Flex>
            <Box
              w={"100%"}
              border="1px"
              borderRadius="5px"
              borderColor="gray.200"
              bg="gray.50"
              _dark={{
                bg: "gray.800",
                borderColor: "gray.600",
              }}
              pb={1}
              minHeight={editorHeight} // To avoid resizing when editor loads
            >
              <CodeHeader
                language="yaml"
                code={webHandlerConfig}
                codeDownloadFilename={configDownloadFilename}
                isLoading={false}
              >
                <ReactCodeMirror
                  value={webHandlerConfig}
                  extensions={[yaml()]}
                  theme={colorMode}
                  height={editorHeight}
                  onChange={handleConfigValueChange}
                />
              </CodeHeader>
            </Box>
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
