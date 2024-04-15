import { Box, Button, Heading, ModalBody, Text, VStack, useColorMode } from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";

import ReactCodeMirror from "@uiw/react-codemirror";
import { MdSave } from "react-icons/md";
import YAML from "yaml";
import { useAlert } from "../../hooks/use-alert";
import { useWebHandlers } from "../../hooks/use-web-handlers";
import { WebHandler, WebHandlers } from "../../lib/WebHandler";
import CodeHeader from "../CodeHeader";

import { yaml } from "@codemirror/lang-yaml";
import useMobileBreakpoint from "../../hooks/use-mobile-breakpoint";

function WebHandlersConfig() {
  const { webHandlers, registerHandlers } = useWebHandlers();
  const { success, error } = useAlert();

  const getWebHandlersYaml = useCallback((webHandlers: WebHandlers) => {
    const onBoardingInstructions = `#####################################################################
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
##                 if your prompt text is a match.
##                 The match patterns are evaluated in the order
##                 of your Web Handler definitions.
#####################################################################`;

    const sampleWebHandlers = `## Example:
# - handlerUrl: https://taras-scrape2md.web.val.run/
#   method: GET
#   matchPattern: ^https:\\/\\/\\S*$\n`;

    return `${onBoardingInstructions}\n\n${YAML.stringify(
      webHandlers.map((handler) => ({ ...handler, matchPattern: handler.matchPattern.source }))
    )}\n${sampleWebHandlers}`;
  }, []);

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
  const isMobile = useMobileBreakpoint();

  return (
    <ModalBody>
      <VStack gap={4} mt={3}>
        <Text textAlign={isMobile ? "justify" : "start"}>
          {/* eslint-disable-next-line react/no-unescaped-entities */}
          If you want to extend ChatCraft's default URL handling by adding your own external
          services, you are at the right place 😎
        </Text>

        <Heading size={"md"} width={"100%"} fontWeight={"normal"}>
          Register Handlers
        </Heading>

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
        <Button size="sm" alignSelf="flex-end" rightIcon={<MdSave />} onClick={onSaveConfig}>
          Save
        </Button>
      </VStack>
    </ModalBody>
  );
}

export default WebHandlersConfig;
