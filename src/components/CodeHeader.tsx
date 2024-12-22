import { memo, type ReactNode, useCallback, useMemo, useState } from "react";
import {
  Box,
  Flex,
  IconButton,
  Menu,
  MenuButton,
  Spinner,
  Text,
  useClipboard,
  useColorModeValue,
} from "@chakra-ui/react";
import { TbCopy, TbDownload, TbExternalLink, TbRun } from "react-icons/tb";

import { download, formatAsCodeBlock } from "../lib/utils";
import { useAlert } from "../hooks/use-alert";
import { isRunnableInBrowser, runCode } from "../lib/run-code";

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
  const [isRunning, setIsRunning] = useState(false);
  // Only show the "Run" button for JS code blocks, and only when we aren't already loading
  const shouldShowRunButton = isRunnableInBrowser(language) && onPrompt;

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

  const handleRunBrowser = useCallback(async () => {
    if (!onPrompt) {
      return;
    }
    setIsRunning(true);

    try {
      let { logs, ret } = await runCode(code, language);

      if (typeof ret === "string") {
        // catch corner cases with strings
        if (!ret.length || ret[0] === "/") {
          ret = formatAsCodeBlock(JSON.stringify(ret), "js");
        } else if (ret.startsWith("<")) {
          // Probably HTML
          ret = formatAsCodeBlock(ret, "html");
        } else {
          // result is good to include inline as is, might have formatting, etc
        }
      } else {
        const maybeJSON = JSON.stringify(ret);
        // catch corner case where JSON.stringify returns undefined but underlying object is truthy, eg a function
        if (!maybeJSON && ret && typeof ret.toString === "function") {
          ret = formatAsCodeBlock(ret.toString(), "js");
        } else if (ret === undefined) {
          // If we have logs and the return value is `undefined`, prefer the logs.
          if (logs) {
            ret = formatAsCodeBlock(logs, "logs");
            logs = undefined;
          } else {
            ret = formatAsCodeBlock(ret, "js");
          }
        } else {
          ret = formatAsCodeBlock(maybeJSON, "json");
        }
      }

      if (logs) {
        logs = formatAsCodeBlock(logs, "logs");
        ret = logs + "\n\n" + ret;
      }

      if (ret !== undefined || logs) {
        onPrompt(ret);
      }
    } catch (error: any) {
      onPrompt(
        formatAsCodeBlock(
          error instanceof Error ? `${error.name}: ${error.message}\n${error.stack}` : `${error}`
        )
      );
    } finally {
      setIsRunning(false);
    }
  }, [onPrompt, code, language]);

  const toUrl = (code: string) =>
    URL.createObjectURL(new Blob([code], { type: "text/plain;charset=utf-8" }));

  const url = useMemo(() => {
    if (isLoading) {
      return "about:blank";
    }
    return toUrl(code);
  }, [isLoading, code]);

  const handlePreviewCode = useCallback(() => {
    window.open(url, "_blank", "noopener,noreferrer");
  }, [url]);

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
        <Flex pr={2}>
          {shouldShowRunButton && (
            <Menu strategy="fixed">
              <MenuButton
                as={IconButton}
                size="sm"
                aria-label="Run code"
                title="Run code"
                icon={isRunning ? <Spinner size="xs" /> : <TbRun />}
                color="gray.600"
                _dark={{ color: "gray.300" }}
                variant="ghost"
                isDisabled={isLoading}
                onClick={handleRunBrowser}
              />
            </Menu>
          )}
          <IconButton
            size="sm"
            aria-label="Open Code in New Window"
            title="Open Code in New Window"
            icon={<TbExternalLink />}
            color="gray.600"
            _dark={{ color: "gray.300" }}
            variant="ghost"
            isDisabled={isLoading}
            onClick={handlePreviewCode}
          />
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
        </Flex>
      </Flex>
      {children}
    </>
  );
}

export default memo(CodeHeader);
