import { type ReactNode } from "react";
import {
  Flex,
  ButtonGroup,
  IconButton,
  useToast,
  useClipboard,
  useColorModeValue,
  Text,
  Box,
} from "@chakra-ui/react";
import { TbCopy, TbDownload, TbRun } from "react-icons/tb";

type PreHeaderProps = {
  language: string;
  children: ReactNode;
  onPrompt?: (prompt: string) => void;
  code: string;
};

function CodeHeader({ language, children, onPrompt, code }: PreHeaderProps) {
  const { onCopy } = useClipboard(code);
  const toast = useToast();

  const handleCopy = () => {
    onCopy();
    toast({
      title: "Copied to Clipboard",
      description: "Code was copied to your clipboard.",
      status: "info",
      duration: 3000,
      position: "top",
      isClosable: true,
    });
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.setAttribute("download", "code.txt");
    anchor.setAttribute("href", url);
    anchor.click();

    toast({
      title: "Downloaded",
      description: "Code was downloaded as a file",
      status: "info",
      duration: 3000,
      position: "top",
      isClosable: true,
    });
  };

  const handleRun = async () => {
    if (!onPrompt) {
      return;
    }
    let ret = undefined;
    try {
      let evalResult = eval(code);
      if (evalResult instanceof Promise) {
        evalResult = await evalResult;
      }
      if (typeof evalResult !== "string") {
        evalResult = JSON.stringify(evalResult);
      }
      // this probably needs smarter escaping
      ret = "```\n" + evalResult + "\n```";
    } catch (error: any) {
      ret = error instanceof Error ? `${error.name}: ${error.message}\n${error.stack}` : `${error}`;
    }
    onPrompt(ret);
  };

  return (
    <>
      <Flex
        bg={useColorModeValue("gray.200", "gray.600")}
        alignItems="center"
        justify="space-between"
        align="center"
        mb={2}
      >
        <Box pl={2}>
          <Text as="code" fontSize="xs">
            {language}
          </Text>
        </Box>
        <ButtonGroup isAttached pr={2}>
          {(language === "js" || language === "javascript") && onPrompt && (
            <IconButton
              size="sm"
              aria-label="Run code"
              title="Run code"
              icon={<TbRun />}
              color="gray.600"
              _dark={{ color: "gray.300" }}
              variant="ghost"
              onClick={handleRun}
            />
          )}
          <IconButton
            size="sm"
            aria-label="Download code"
            title="Download code"
            icon={<TbDownload />}
            color="gray.600"
            _dark={{ color: "gray.300" }}
            variant="ghost"
            onClick={handleDownload}
          />
          <IconButton
            size="sm"
            aria-label="Copy to Clipboard"
            title="Copy to Clipboard"
            icon={<TbCopy />}
            color="gray.600"
            _dark={{ color: "gray.300" }}
            variant="ghost"
            onClick={handleCopy}
          />
        </ButtonGroup>
      </Flex>
      {children}
    </>
  );
}

export default CodeHeader;
