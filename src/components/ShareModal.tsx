import { useCallback, useState } from "react";
import {
  Button,
  FormControl,
  Flex,
  FormLabel,
  FormHelperText,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  VStack,
  Text,
  Input,
  FormErrorMessage,
  Textarea,
  ButtonGroup,
  IconButton,
} from "@chakra-ui/react";
import { useCopyToClipboard } from "react-use";
import { BsGithub } from "react-icons/bs";
import { TbCopy } from "react-icons/tb";

import { useUser } from "../hooks/use-user";
import { ChatCraftChat } from "../lib/ChatCraftChat";
import { useSettings } from "../hooks/use-settings";
import { ChatCraftHumanMessage, ChatCraftSystemMessage } from "../lib/ChatCraftMessage";
import useChatOpenAI from "../hooks/use-chat-openai";

type AuthenticatedForm = {
  chat: ChatCraftChat;
  user: User;
};

function AuthenticatedForm({ chat, user }: AuthenticatedForm) {
  const { settings } = useSettings();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [summary, setSummary] = useState<string>(chat.summary);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [, copyToClipboard] = useCopyToClipboard();
  const { callChatApi } = useChatOpenAI();

  const handleShareClick = async () => {
    setIsSharing(true);
    try {
      const { url } = await chat.share(user, summary);
      if (!url) {
        throw new Error("Unable to create Share URL");
      }
      setUrl(url);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsSharing(false);
    }
  };

  const summarizeChat = useCallback(
    async (chat: ChatCraftChat) => {
      const systemChatMessage = new ChatCraftSystemMessage({
        text: "You are an expert at writing short summaries.",
      });
      const summarizeInstruction = new ChatCraftHumanMessage({
        text: `Summarize this chat in 25 words or fewer. Respond only with the summary text and focus on the main content, not mentioning the process or participants. For example: "Using a React context and hook to keep track of user state after login."`,
      });
      const messages = chat.messages({ includeAppMessages: false, includeSystemMessages: false });

      try {
        // TODO: this can fail if the chat is too long for gpt-3.5-turbo.
        // callChatApi() should use a sliding context window
        const { text } = await callChatApi([systemChatMessage, ...messages, summarizeInstruction]);
        return text.trim();
      } catch (err) {
        console.error("Error summarizing chat", err);
        throw err;
      }
    },
    [callChatApi]
  );

  const handleSummarizeClick = useCallback(async () => {
    if (!settings.apiKey) {
      return;
    }
    try {
      setIsSummarizing(true);
      const summary = await summarizeChat(chat);
      setSummary(summary);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsSummarizing(false);
    }
  }, [settings.apiKey, chat, setIsSummarizing, summarizeChat]);

  const handleCopyClick = useCallback(() => {
    copyToClipboard(url);
  }, [url, copyToClipboard]);

  return (
    <VStack gap={2}>
      <FormControl>
        <FormLabel>Summary</FormLabel>
        <Textarea value={summary} onChange={(e) => setSummary(e.target.value)}></Textarea>
      </FormControl>

      <FormControl>
        <FormLabel>
          Use your own <strong>Title</strong> and <strong>Summary</strong>, or click{" "}
          <strong>Summarize</strong> to generate them automatically using GPT 3.5.
        </FormLabel>
        <ButtonGroup w="100%" justifyContent="space-between">
          <Button
            variant="outline"
            onClick={() => handleSummarizeClick()}
            isDisabled={!settings.apiKey}
            isLoading={isSummarizing}
            loadingText="Summarizing..."
          >
            Summarize
          </Button>
          <Button onClick={() => handleShareClick()} isLoading={isSharing} loadingText="Sharing...">
            Share Chat
          </Button>
        </ButtonGroup>

        {error && <FormErrorMessage>{error}</FormErrorMessage>}
      </FormControl>

      {url && (
        <FormControl>
          <FormLabel>Public Share URL</FormLabel>
          <Flex gap={1}>
            <Input autoFocus={true} type="url" defaultValue={url} readOnly flex={1} />{" "}
            <IconButton
              icon={<TbCopy />}
              aria-label="Copy URL"
              variant="ghost"
              onClick={() => handleCopyClick()}
            />
          </Flex>
          <FormHelperText>Anyone can access the chat using this URL.</FormHelperText>
        </FormControl>
      )}
    </VStack>
  );
}

function UnauthenticatedForm({ onLoginClick }: { onLoginClick: () => void }) {
  return (
    <VStack gap={2}>
      <FormControl>
        <FormLabel>Create Public URL</FormLabel>
        <Button onClick={() => onLoginClick()}>
          <BsGithub /> <Text ml={2}>Sign in with GitHub</Text>
        </Button>
        <FormHelperText>
          To avoid abuse and spam, we ask that users authenticate with an existing GitHub account
          before creating public URLs.
        </FormHelperText>
      </FormControl>
    </VStack>
  );
}

type ShareModalProps = {
  chat: ChatCraftChat;
  isOpen: boolean;
  onClose: () => void;
};

function ShareModal({ chat, isOpen, onClose }: ShareModalProps) {
  const { user, login } = useUser();

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Sharing</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {user ? (
            <AuthenticatedForm chat={chat} user={user} />
          ) : (
            <UnauthenticatedForm onLoginClick={() => login(chat.id)} />
          )}
        </ModalBody>
        <ModalFooter></ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default ShareModal;
