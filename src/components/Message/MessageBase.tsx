import { memo, useCallback, type ReactNode } from "react";
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Flex,
  Heading,
  IconButton,
  Link,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Text,
  useClipboard,
  useToast,
} from "@chakra-ui/react";
import { TbDots } from "react-icons/tb";
import { Link as ReactRouterLink, useNavigate } from "react-router-dom";

import { formatDate, download } from "../../lib/utils";
import Markdown from "../Markdown";
// Styles for the message text are defined in CSS vs. Chakra-UI
import "./Message.css";

export interface MessageBaseProps {
  id: string;
  chatId: string;
  date: Date;
  heading?: string;
  text: string;
  avatar: ReactNode;
  isLoading: boolean;
  hidePreviews?: boolean;
  onPrompt?: (prompt: string) => void;
  onDeleteClick?: () => void;
  disableFork?: boolean;
  disableEdit?: boolean;
}

function MessageBase({
  id,
  chatId,
  date,
  heading,
  text,
  avatar,
  isLoading,
  hidePreviews,
  onDeleteClick,
  onPrompt,
  disableFork,
  disableEdit,
}: MessageBaseProps) {
  const { onCopy } = useClipboard(text);
  const toast = useToast();
  const navigate = useNavigate();

  const handleCopy = useCallback(() => {
    onCopy();
    toast({
      title: "Copied to Clipboard",
      description: "Message text was copied to your clipboard.",
      status: "info",
      duration: 3000,
      position: "top",
      isClosable: true,
    });
  }, [onCopy, toast]);

  const handleDownload = useCallback(() => {
    download(text, "message.md");
    toast({
      title: "Downloaded",
      description: "Message was downloaded as a file",
      status: "info",
      duration: 3000,
      position: "top",
      isClosable: true,
    });
  }, [toast, text]);

  return (
    <Box id={id} my={6} flex={1}>
      <Card>
        <CardHeader p={0} py={1} pr={1}>
          <Flex justify="space-between" align="center" ml={5} mr={2}>
            <Flex gap={3}>
              <Box>{avatar}</Box>
              <Flex direction="column" justify="center">
                <Flex h="100%" align="center" gap={3}>
                  <Heading as="h2" size="xs">
                    {heading}
                  </Heading>
                  <Text as="span" fontSize="sm">
                    <Link
                      as={ReactRouterLink}
                      to={`/c/${chatId}#${id}`}
                      color="gray.500"
                      _dark={{ color: "gray.300" }}
                    >
                      {formatDate(date)}
                    </Link>
                  </Text>
                </Flex>
              </Flex>
            </Flex>

            <Menu>
              <MenuButton
                as={IconButton}
                aria-label="Message Menu"
                icon={<TbDots />}
                variant="ghost"
                isDisabled={isLoading}
              />
              <MenuList>
                <MenuItem onClick={() => handleCopy()}>Copy</MenuItem>
                <MenuItem onClick={() => handleDownload()}>Download</MenuItem>
                {!disableFork && (
                  <MenuItem onClick={() => navigate(`./fork/${id}`)}>
                    Duplicate Chat from Message...
                  </MenuItem>
                )}
                {!disableEdit && onDeleteClick && <MenuDivider />}
                {!disableEdit && <MenuItem>Edit (TODO...)</MenuItem>}
                {onDeleteClick && (
                  <MenuItem onClick={() => onDeleteClick()} color="red.400">
                    Delete
                  </MenuItem>
                )}
              </MenuList>
            </Menu>
          </Flex>
        </CardHeader>
        <CardBody p={0}>
          <Flex direction="column" gap={3}>
            <Box maxWidth="100%" minH="2em" overflow="hidden" px={6} pb={2}>
              {/* Messages are being rendered in Markdown format */}
              <Markdown previewCode={!hidePreviews} isLoading={isLoading} onPrompt={onPrompt}>
                {text}
              </Markdown>
            </Box>
          </Flex>
        </CardBody>
      </Card>
    </Box>
  );
}

export default memo(MessageBase);
