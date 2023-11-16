import { memo, useCallback, type ReactNode } from "react";
import {
  Flex,
  ButtonGroup,
  IconButton,
  useClipboard,
  useColorModeValue,
  Text,
  Box,
} from "@chakra-ui/react";
import { TbCopy, TbDownload, TbRun } from "react-icons/tb";

import { download, formatAsCodeBlock } from "../lib/utils";
import { useAlert } from "../hooks/use-alert";
import { isRunnable, runCode } from "../lib/run-code";

type PreHeaderProps = {
  language: string;
  children: ReactNode;
  isLoading: boolean;
  onPrompt?: (prompt: string) => void;
  code: string;
  codeDownloadFilename?: string;
};

function CodeHeader({
  language,
  children,
  isLoading,
  onPrompt,
  code,
  codeDownloadFilename,
}: PreHeaderProps) {
  const { onCopy } = useClipboard(code);
  const { info } = useAlert();
  // Only show the "Run" button for JS code blocks, and only when we aren't already loading
  const shouldShowRunButton = isRunnable(language) && onPrompt;

  const handleCopy = useCallback(() => {
    onCopy();
    info({
      title: "Copied to Clipboard",
      message: "Code was copied to your clipboard.",
    });
  }, [onCopy, info]);

  const handleDownload = useCallback(() => {
    download(code, codeDownloadFilename ?? "code.txt");
    info({
      title: "Downloaded",
      message: "Code was downloaded as a file",
    });
  }, [info, code, codeDownloadFilename]);

  const handleRun = useCallback(async () => {
    if (!onPrompt) {
      return;
    }

    let ret = undefined;
    try {
      let resultWithLogs = await runCode(code, language);
      let result = resultWithLogs.ret;
      if (typeof result === "string") {
        // catch corner cases with strings
        if (!result.length || result[0] === "/") {
          result = formatAsCodeBlock(JSON.stringify(result), "js");
        } else {
          // result is good to include inline, might have formatting, etc
        }
      } else {
        let maybeJSON = JSON.stringify(result);
        // catch corner case where JSON.stringify returns undefined but underlying object is truthy, eg a function
        if (!maybeJSON && result && typeof result.toString === "function") {
          result = formatAsCodeBlock(result.toString(), "js");
        } else {
          result = formatAsCodeBlock(maybeJSON, "json");
        }
      }
      if (resultWithLogs.logs) {
        resultWithLogs.logs = formatAsCodeBlock(resultWithLogs.logs, "logs");
        result = resultWithLogs.logs + "\n\n" + result;
      }
      // let js decide how to render the result
      ret = result;
    } catch (error: any) {
      ret = formatAsCodeBlock(
        error instanceof Error ? `${error.name}: ${error.message}\n${error.stack}` : `${error}`
      );
    }
    if (ret !== undefined) {
      onPrompt(ret);
    }
  }, [onPrompt, code, language]);

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
          {shouldShowRunButton && (
            <IconButton
              size="sm"
              aria-label="Run code"
              title="Run code"
              icon={<TbRun />}
              color="gray.600"
              _dark={{ color: "gray.300" }}
              variant="ghost"
              onClick={handleRun}
              isDisabled={isLoading}
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

export default memo(CodeHeader);
