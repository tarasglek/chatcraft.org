import { memo, useCallback, type ReactNode } from "react";
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Flex,
  Heading,
  IconButton,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  useClipboard,
  useToast,
} from "@chakra-ui/react";
import { TbDots } from "react-icons/tb";

import Markdown from "../Markdown";
// Styles for the message text are defined in CSS vs. Chakra-UI
import "./Message.css";

export interface MessageBaseProps {
  heading?: string;
  text: string;
  avatar: ReactNode;
  isLoading: boolean;
  hidePreviews?: boolean;
  onPrompt?: (prompt: string) => void;
  onDeleteClick?: () => void;
}

function MessageBase({
  heading,
  text,
  avatar,
  isLoading,
  hidePreviews,
  onDeleteClick,
  onPrompt,
}: MessageBaseProps) {
  const { onCopy } = useClipboard(text);
  const toast = useToast();

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

  return (
    <Box my={6} flex={1}>
      <Card>
        <CardHeader p={0} py={1} pr={1}>
          <Flex justify="space-between" align="center" ml={5} mr={2}>
            <Flex gap={3}>
              <Box>{avatar}</Box>
              <Flex direction="column" justify="center">
                <Heading as="h2" size="xs">
                  {heading}
                </Heading>
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
                <MenuDivider />
                <MenuItem>Edit (TODO...)</MenuItem>
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
            <Divider />
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
