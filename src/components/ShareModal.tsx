import { useCallback, useState } from "react";
import {
  Flex,
  VStack,
  Text,
  Input,
  Textarea,
  Group as ButtonGroup,
  IconButton,
} from "@chakra-ui/react";
import { useCopyToClipboard } from "react-use";
import { Field } from "./ui/field";
import { Button } from "./ui/button";
import {
  DialogBackdrop,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTrigger,
} from "./ui/dialog";
import { BsGithub } from "react-icons/bs";
import { TbCopy, TbShare3 } from "react-icons/tb";
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
  const [feedUrl, setFeedUrl] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [summary, setSummary] = useState<string>(chat.summary);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [, copyToClipboard] = useCopyToClipboard();
  const { callChatApi } = useChatOpenAI();
  const supportsWebShare = !!navigator.share;

  const handleShareClick = async () => {
    setIsSharing(true);
    try {
      const { url } = await chat.share(user, summary);
      if (!url) {
        throw new Error("Unable to create Share URL");
      }
      setUrl(url);
      const parsedUrl = new URL(url);
      const newUserFeedUrl = `${parsedUrl.origin}/api/share/${user.username}/feed.atom`;
      setFeedUrl(newUserFeedUrl);
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
    if (!settings.currentProvider.apiKey) {
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
  }, [settings.currentProvider.apiKey, chat, setIsSummarizing, summarizeChat]);

  const handleCopyClick = useCallback(() => {
    copyToClipboard(url);
  }, [url, copyToClipboard]);

  const handleCopyFeedClick = useCallback(() => {
    copyToClipboard(feedUrl);
  }, [feedUrl, copyToClipboard]);

  const handleShareUrl = async (url: string) => {
    await navigator
      .share({ title: "ChatCraft Chat", text: chat.summary, url })
      .catch(console.error);
  };

  return (
    <VStack gap={2}>
      <Field label="Summary">
        <Textarea value={summary} onChange={(e) => setSummary(e.target.value)}>
          {chat.summary}
        </Textarea>
      </Field>

      <Field
        label={` Enter your own ${(<strong>Summary</strong>)}, or click ${(<strong>Summarize</strong>)} to generate
          one automatically.`}
        errorText={error}
      >
        <ButtonGroup w="100%" justifyContent="space-between">
          <Button
            variant="outline"
            onClick={() => handleSummarizeClick()}
            disabled={!settings.currentProvider.apiKey}
            loading={isSummarizing}
            loadingText="Summarizing..."
          >
            Summarize
          </Button>
          <Button onClick={() => handleShareClick()} loading={isSharing} loadingText="Sharing...">
            Share Chat
          </Button>
        </ButtonGroup>
      </Field>

      {url && (
        <>
          <Field label="Public Share URL" helperText="Anyone can access the chat using this URL.">
            <Flex gap={1}>
              <Input autoFocus={false} type="url" defaultValue={url} readOnly flex={1} />{" "}
              {supportsWebShare && (
                <IconButton
                  aria-label="Share URL"
                  variant="ghost"
                  onClick={() => handleShareUrl(url)}
                >
                  <TbShare3 />
                </IconButton>
              )}
              <IconButton aria-label="Copy URL" variant="ghost" onClick={() => handleCopyClick()}>
                <TbCopy />
              </IconButton>
            </Flex>
          </Field>
          <Field
            mt={4}
            label="Public Shared Chats Feed URL"
            helperText="Anyone can access the shared chats feed using this URL."
          >
            <Flex gap={1}>
              <Input autoFocus={false} type="url" defaultValue={feedUrl} readOnly flex={1} />{" "}
              {supportsWebShare && (
                <IconButton
                  aria-label="Share Feed URL"
                  variant="ghost"
                  onClick={() => handleShareUrl(feedUrl)}
                >
                  <TbShare3 />
                </IconButton>
              )}
              <IconButton
                aria-label="Copy URL"
                variant="ghost"
                onClick={() => handleCopyFeedClick()}
              >
                <TbCopy />
              </IconButton>
            </Flex>
          </Field>
        </>
      )}
    </VStack>
  );
}

function UnauthenticatedForm({ onLoginClick }: { onLoginClick: () => void }) {
  return (
    <VStack gap={2}>
      <Field
        label="Create Public URL"
        helperText="To avoid abuse and spam, we ask that users authenticate with an existing GitHub account
          before creating public URLs."
      >
        <Button onClick={() => onLoginClick()}>
          <BsGithub /> <Text ml={2}>Sign in with GitHub</Text>
        </Button>
      </Field>
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
  //closeOnEscape={onClose}
  return (
    <DialogRoot open={isOpen} size="lg" onOpenChange={onClose}>
      <DialogBackdrop />
      <DialogTrigger></DialogTrigger>
      <DialogContent>
        <DialogHeader>Sharing</DialogHeader>
        <DialogCloseTrigger />
        <DialogBody>
          {user ? (
            <AuthenticatedForm chat={chat} user={user} />
          ) : (
            <UnauthenticatedForm onLoginClick={() => login(chat.id)} />
          )}
        </DialogBody>
        <DialogFooter></DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}

export default ShareModal;
