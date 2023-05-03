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
import { TbCopy, TbDownload } from "react-icons/tb";

type PreHeaderProps = { language: string; children: ReactNode; code: string };

function CodeHeader({ language, children, code }: PreHeaderProps) {
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
