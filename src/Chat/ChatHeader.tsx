import { FormEvent, useEffect, useState } from "react";
import {
  Box,
  Button,
  ButtonGroup,
  Card,
  CardBody,
  CardFooter,
  Flex,
  IconButton,
  Input,
  Link,
  Tag,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { Link as ReactRouterLink } from "react-router-dom";
import { MdOutlineChatBubbleOutline } from "react-icons/md";
import { AiOutlineEdit } from "react-icons/ai";
import { useKey } from "react-use";

import { ChatCraftChat } from "../lib/ChatCraftChat";
import { formatCurrency, formatDate, formatNumber } from "../lib/utils";
import ShareModal from "../components/ShareModal";
import { useSettings } from "../hooks/use-settings";
import useTitle from "../hooks/use-title";
import { useCost } from "../hooks/use-cost";
import { useAlert } from "../hooks/use-alert";

type ChatHeaderProps = {
  chat: ChatCraftChat;
};

function ChatHeader({ chat }: ChatHeaderProps) {
  const { isOpen, onClose } = useDisclosure();
  const [tokens, setTokens] = useState<number | null>(null);
  const { cost } = useCost();
  const [isEditing, setIsEditing] = useState(false);
  const { settings } = useSettings();
  const title = useTitle(chat);
  const { error } = useAlert();

  useKey("Escape", () => setIsEditing(false), { event: "keydown" }, [setIsEditing]);

  useEffect(() => {
    setIsEditing(false);
  }, [chat.id]);

  useEffect(() => {
    if (settings.countTokens) {
      chat.tokens().then(setTokens).catch(console.warn);
    }
  }, [settings.countTokens, chat]);

  const handleSaveSummary = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const data = new FormData(e.target as HTMLFormElement);
    const summary = data.get("summary");
    if (typeof summary !== "string") {
      return;
    }

    chat.summary = summary;
    chat
      .save()
      .catch((err) => {
        console.warn("Unable to update summary for chat", err);
        error({
          title: `Error Updating Chat`,
          message: err.message,
        });
      })
      .finally(() => setIsEditing(false));
  };

  return (
    <>
      <Card
        variant="filled"
        bg="gray.200"
        size="sm"
        border="1px solid"
        borderColor="gray.300"
        _dark={{
          bg: "gray.800",
          borderColor: "gray.900",
        }}
        mt={2}
      >
        <CardBody pb={0}>
          <Box w="100%">
            {isEditing ? (
              <form onSubmit={handleSaveSummary}>
                <Flex align="center" gap={2} px={2} pb={2}>
                  <Input
                    flex={1}
                    defaultValue={chat.summary}
                    type="text"
                    name="summary"
                    bg="white"
                    _dark={{ bg: "gray.700" }}
                    size="sm"
                    borderRadius={4}
                    fontSize="1rem"
                    w="100%"
                    autoFocus={true}
                    placeholder="Chat Summary"
                  />
                  <ButtonGroup>
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" type="submit">
                      Save
                    </Button>
                  </ButtonGroup>
                </Flex>
              </form>
            ) : (
              <Flex align="center" gap={2} maxW="100%">
                <Box>
                  <MdOutlineChatBubbleOutline />
                </Box>
                <Text fontSize="md" fontWeight="bold" noOfLines={1} title={title}>
                  <Link as={ReactRouterLink} to={`/c/${chat.id}`}>
                    {title}
                  </Link>
                </Text>
                {!chat.readonly && settings.currentProvider.apiKey && (
                  <IconButton
                    variant="ghost"
                    size="sm"
                    icon={<AiOutlineEdit />}
                    aria-label="Edit summary"
                    title="Edit summary"
                    onClick={() => setIsEditing(true)}
                  />
                )}
              </Flex>
            )}
          </Box>
        </CardBody>
        <CardFooter pt={0}>
          <Flex w="100%" gap={4} color="gray.500" _dark={{ color: "gray.400" }}>
            <Link as={ReactRouterLink} to={`/c/${chat.id}`}>
              <Text fontSize="sm" ml={6}>
                {formatDate(chat.date)}
              </Text>
            </Link>
            {settings.countTokens && tokens && (
              <Flex gap={2}>
                <Tag size="sm" variant="outline" colorScheme="gray">
                  {formatNumber(tokens)} Tokens
                </Tag>
                <Tag key="token-cost" size="sm" variant="outline" colorScheme="gray">
                  {formatCurrency(cost)}
                </Tag>
              </Flex>
            )}
          </Flex>
        </CardFooter>
      </Card>

      <ShareModal chat={chat} isOpen={isOpen} onClose={onClose} />
    </>
  );
}

export default ChatHeader;
