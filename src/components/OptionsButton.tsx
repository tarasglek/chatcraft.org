import {
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  IconButton,
  Input,
  useDisclosure,
} from "@chakra-ui/react";
import { Link as ReactRouterLink, useFetcher } from "react-router-dom";
import { TbShare2, TbTrash, TbCopy, TbDownload } from "react-icons/tb";
import { PiGearBold } from "react-icons/pi";
import { BsPaperclip } from "react-icons/bs";
import { useCallback, useRef } from "react";
import { useCopyToClipboard } from "react-use";

import { ChatCraftChat } from "../lib/ChatCraftChat";
import { useUser } from "../hooks/use-user";
import { useAlert } from "../hooks/use-alert";
import { useSettings } from "../hooks/use-settings";
import ShareModal from "./ShareModal";
import { download, compressImageToBase64 } from "../lib/utils";
import theme from "../theme";

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
        <MenuItem icon={<TbShare2 />} isDisabled={true}>
          Share
        </MenuItem>
      </>
    );
  }

  return (
    <>
      <MenuItem icon={<TbShare2 />} onClick={supportsWebShare ? handleWebShare : onOpen}>
        Share
      </MenuItem>
      <ShareModal chat={chat} isOpen={isOpen} onClose={onClose} />
    </>
  );
}

type OptionsButtonProps = {
  chat?: ChatCraftChat;
  forkUrl?: string;
  variant?: "outline" | "solid" | "ghost";
  iconOnly?: boolean;
  // Optional until we support on mobile...
  onFileSelected?: (base64: string) => void;
  isDisabled?: boolean;
};

function OptionsButton({
  chat,
  forkUrl,
  variant = "outline",
  onFileSelected,
  iconOnly = false,
  isDisabled = false,
}: OptionsButtonProps) {
  const fetcher = useFetcher();
  const { info, error } = useAlert();
  const [, copyToClipboard] = useCopyToClipboard();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { settings } = useSettings();

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!onFileSelected) {
        return;
      }

      const files = event.target.files;

      if (files) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file.type.startsWith("image/")) {
            onFileSelected("");
            compressImageToBase64(
              file,
              settings.compressionFactor,
              settings.maxCompressedFileSizeMb
            )
              .then((base64) => onFileSelected(base64))
              .catch((err) => {
                console.error(err);
                error({ title: "Error processing images", message: err.message });
              });
          } else {
            const reader = new FileReader();
            reader.onload = (e) => {
              onFileSelected(e.target?.result as string);
            };
            reader.readAsDataURL(file);
          }
        }
        // Reset the input value after file read
        event.target.value = "";
      }
    },
    [error, onFileSelected]
  );

  const handleAttachFiles = useCallback(() => {
    fileInputRef.current?.click();
  }, [fileInputRef]);

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
    <Menu strategy="fixed">
      {iconOnly ? (
        <MenuButton
          isDisabled={isDisabled}
          as={IconButton}
          size="lg"
          variant="outline"
          icon={<PiGearBold />}
          isRound
        />
      ) : (
        <MenuButton
          isDisabled={isDisabled}
          as={Button}
          size="sm"
          variant={variant}
          leftIcon={<PiGearBold />}
        >
          Options
        </MenuButton>
      )}
      <MenuList zIndex={theme.zIndices.dropdown}>
        <MenuItem as={ReactRouterLink} to="/new">
          Clear
        </MenuItem>
        <MenuItem as={ReactRouterLink} to="/new" target="_blank">
          New Window
        </MenuItem>
        {!!forkUrl && (
          <MenuItem as={ReactRouterLink} to={forkUrl} target="_blank">
            Duplicate...
          </MenuItem>
        )}
        <MenuDivider />
        <MenuItem isDisabled={!chat} icon={<TbCopy />} onClick={() => handleCopyClick()}>
          Copy
        </MenuItem>
        <MenuItem icon={<TbDownload />} isDisabled={!chat} onClick={() => handleDownloadClick()}>
          Download
        </MenuItem>
        <ShareMenuItem chat={chat} />
        <MenuDivider />
        {!!onFileSelected && (
          <>
            <Input
              multiple
              type="file"
              ref={fileInputRef}
              hidden
              onChange={handleFileChange}
              accept="image/*"
            />
            <MenuItem icon={<BsPaperclip />} onClick={handleAttachFiles}>
              Attach Files...
            </MenuItem>
            <MenuDivider />
          </>
        )}
        {!chat?.readonly && (
          <MenuItem
            color="red.400"
            icon={<TbTrash />}
            isDisabled={!chat}
            onClick={() => handleDeleteClick()}
          >
            Delete Chat
          </MenuItem>
        )}
      </MenuList>
    </Menu>
  );
}

export default OptionsButton;
