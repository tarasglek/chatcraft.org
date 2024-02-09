import {
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  IconButton,
  useDisclosure,
} from "@chakra-ui/react";
import { Link as ReactRouterLink, useFetcher, useLoaderData } from "react-router-dom";
import { TbPlus } from "react-icons/tb";
import { useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useCopyToClipboard } from "react-use";

import { ChatCraftChat } from "../lib/ChatCraftChat";
import { useUser } from "../hooks/use-user";
import { useAlert } from "../hooks/use-alert";
import ShareModal from "./ShareModal";
import { download } from "../lib/utils";

function ShareMenuItem({ chat }: { chat?: ChatCraftChat }) {
  const supportsWebShare = !!navigator.share;
  const { user } = useUser();
  const { error } = useAlert();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleWebShare = useCallback(async () => {
    if (!chat || !user) {
      return;
    }

    try {
      const { url } = await chat.share(user);
      if (!url) {
        throw new Error("Unable to create share URL for chat");
      }

      navigator.share({ title: "ChatCraft Chat", text: chat.summary, url });
    } catch (err: any) {
      console.error(err);
      error({ title: "Unable to share chat", message: err.message });
    }
  }, [chat, user, error]);

  // Nothing to share, disable the menu item
  if (!chat) {
    return (
      <>
        <MenuDivider />
        <MenuItem isDisabled={true}>Share</MenuItem>
      </>
    );
  }

  return (
    <>
      <MenuItem onClick={supportsWebShare ? handleWebShare : onOpen}>Share</MenuItem>
      <ShareModal chat={chat} isOpen={isOpen} onClose={onClose} />
    </>
  );
}

type CommandButtonProps = {
  forkUrl?: string;
  variant?: "outline" | "solid" | "ghost";
  iconOnly?: boolean;
};

function CommandButton({ forkUrl, variant = "outline", iconOnly = false }: CommandButtonProps) {
  const fetcher = useFetcher();
  const { info } = useAlert();
  const [, copyToClipboard] = useCopyToClipboard();
  const chatId = useLoaderData() as string;
  const chat = useLiveQuery<ChatCraftChat | undefined>(() => {
    if (chatId) {
      return Promise.resolve(ChatCraftChat.find(chatId));
    }
  }, [chatId]);

  const handleCopyClick = useCallback(() => {
    if (!chat) {
      return;
    }

    const text = chat.toMarkdown();
    copyToClipboard(text);
    info({
      title: "Chat copied to clipboard",
    });
  }, [chat, copyToClipboard, info]);

  const handleDownloadClick = useCallback(() => {
    if (!chat) {
      return;
    }

    const text = chat.toMarkdown();
    download(text, "chat.md", "text/markdown");
    info({
      title: "Chat downloaded as Markdown",
    });
  }, [chat, info]);

  const handleDeleteClick = useCallback(() => {
    if (!chat) {
      return;
    }

    fetcher.submit({}, { method: "post", action: `/c/${chat.id}/delete` });
  }, [chat, fetcher]);

  return (
    <Menu>
      {iconOnly ? (
        <MenuButton as={IconButton} size="lg" variant="outline" icon={<TbPlus />} isRound />
      ) : (
        <MenuButton as={Button} size="sm" variant={variant} leftIcon={<TbPlus />}>
          Command
        </MenuButton>
      )}
      <MenuList>
        <MenuItem as={ReactRouterLink} to="/new">
          Clear
        </MenuItem>
        <MenuDivider />
        <MenuItem as={ReactRouterLink} to="/new" target="_blank">
          Open New...
        </MenuItem>
        {!!forkUrl && (
          <MenuItem as={ReactRouterLink} to={forkUrl} target="_blank">
            Duplicate...
          </MenuItem>
        )}
        <MenuDivider />
        <MenuItem isDisabled={!chat} onClick={() => handleCopyClick()}>
          Copy
        </MenuItem>
        <MenuItem isDisabled={!chat} onClick={() => handleDownloadClick()}>
          Download
        </MenuItem>
        <ShareMenuItem chat={chat} />
        <MenuDivider />
        <MenuItem color="red.400" isDisabled={!chat} onClick={() => handleDeleteClick()}>
          Delete
        </MenuItem>
      </MenuList>
    </Menu>
  );
}

export default CommandButton;
