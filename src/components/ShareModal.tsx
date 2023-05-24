import { RefObject, useState } from "react";
import {
  Button,
  FormControl,
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
} from "@chakra-ui/react";
import { BsGithub } from "react-icons/bs";

import { useUser } from "../hooks/use-user";
import { ChatCraftChat } from "../lib/ChatCraftChat";
import { ChatCraftMessage } from "../lib/ChatCraftMessage";
import { createShare } from "../lib/share";

type AuthenticatedForm = {
  user: User;
  token: string;
  chat: ChatCraftChat;
};

function AuthenticatedForm({ user, token, chat }: AuthenticatedForm) {
  const [url, setUrl] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const { id, url } = await createShare(user, token, chat);
      console.log("share", { id, url });
      setUrl(url);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <VStack gap={2}>
      <FormControl>
        <Button onClick={() => handleClick()} isLoading={loading} loadingText="Creating URL...">
          Create URL
        </Button>
        {error ? (
          <FormErrorMessage>{error}</FormErrorMessage>
        ) : (
          <FormHelperText>
            Anyone who knows the public URL will be able to access it.
          </FormHelperText>
        )}
      </FormControl>

      {url && (
        <FormControl>
          <Input type="url" value={url} />
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
  const { user, token, login } = useUser();

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" finalFocusRef={finalFocusRef}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Sharing</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {user && token ? (
            <AuthenticatedForm user={user} token={token} chat={new ChatCraftChat({ messages })} />
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
