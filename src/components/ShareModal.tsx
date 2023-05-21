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
} from "@chakra-ui/react";
import { BsGithub } from "react-icons/bs";

import { useUser } from "../hooks/use-user";
import { ChatCraftChat } from "../lib/ChatCraftChat";
import { ChatCraftMessage } from "../lib/ChatCraftMessage";

type AuthenticatedForm = {
  user: User;
  token: string;
  chat: ChatCraftChat;
};

function AuthenticatedForm({ user, token, chat }: AuthenticatedForm) {
  const [url, setUrl] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/share/${user.username}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chat.serialize()),
      });
      if (!res.ok) {
        throw new Error(`Error creating share URL: ${(await res.json())?.message}`);
      }

      const url = res.headers.get("Location");
      if (!url) {
        throw new Error("Missing URL in response");
      }
      setUrl(url);
    } catch (err) {
      // TODO: UI...
      console.error(err);
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
        <FormHelperText>Anyone who knows the public URL will be able to access it.</FormHelperText>
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
