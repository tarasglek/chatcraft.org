import { RefObject, useCallback, useState } from "react";
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
import { ChatCraftMessage } from "../lib/ChatCraftMessage";
import { summarizeChat } from "../lib/share";
import { useSettings } from "../hooks/use-settings";

type AuthenticatedForm = {
  chat: ChatCraftChat;
};

function AuthenticatedForm({ chat }: AuthenticatedForm) {
  const { settings } = useSettings();
  const [url, setUrl] = useState<string>("");
  const [error, setError] = useState<Error | undefined>();
  const [summary, setSummary] = useState<string>(chat.summary || chat.summarize());
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [, copyToClipboard] = useCopyToClipboard();

  const handleShareClick = async () => {
    setIsSharing(true);
    try {
      const url = await chat.share();
      setUrl(url);
    } catch (err: any) {
      console.error(err);
      setError(err);
    } finally {
      setIsSharing(false);
    }
  };

  const handleSummarizeClick = useCallback(async () => {
    if (!settings.apiKey) {
      return;
    }
    try {
      setIsSummarizing(true);
      const summary = await summarizeChat(settings.apiKey, chat);
      setSummary(summary);
      chat.summary = summary;
      await chat.save();
    } catch (err: any) {
      console.error(err);
      setError(err);
    } finally {
      setIsSummarizing(false);
    }
  }, [settings.apiKey, chat, setIsSummarizing]);

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

        {error && <FormErrorMessage>{error.message}</FormErrorMessage>}
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
          Users must authenticate with GitHub in order to create a public URL.
        </FormHelperText>
      </FormControl>
    </VStack>
  );
}

type ShareModalProps = {
  messages: ChatCraftMessage[];
  isOpen: boolean;
  onClose: () => void;
  finalFocusRef: RefObject<HTMLTextAreaElement>;
};

function ShareModal({ messages, isOpen, onClose, finalFocusRef }: ShareModalProps) {
  const { user, login } = useUser();

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" finalFocusRef={finalFocusRef}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Sharing</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {user ? (
            <AuthenticatedForm chat={new ChatCraftChat({ messages })} />
          ) : (
            <UnauthenticatedForm onLoginClick={login} />
          )}
        </ModalBody>
        <ModalFooter></ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default ShareModal;
