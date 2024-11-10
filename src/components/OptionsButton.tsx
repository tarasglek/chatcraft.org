import { Button, IconButton, Input, useDisclosure } from "@chakra-ui/react";
import { useFetcher } from "react-router-dom";
import { TbShare2, TbTrash, TbCopy, TbDownload } from "react-icons/tb";
import { PiGearBold } from "react-icons/pi";
import { BsPaperclip } from "react-icons/bs";
import { useCallback, useRef } from "react";
import { useCopyToClipboard } from "react-use";
import * as yaml from "yaml";

import { ChatCraftChat } from "../lib/ChatCraftChat";
import { useUser } from "../hooks/use-user";
import { useAlert } from "../hooks/use-alert";
import { useSettings } from "../hooks/use-settings";
import ShareModal from "./ShareModal";
import { download } from "../lib/utils";
import { Menu, MenuDivider, MenuItem, MenuItemLink, SubMenu } from "./Menu";

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
  onAttachFiles?: (files: File[]) => Promise<void>;
  isDisabled?: boolean;
};

function OptionsButton({
  chat,
  forkUrl,
  variant = "outline",
  onAttachFiles,
  iconOnly = false,
  isDisabled = false,
}: OptionsButtonProps) {
  const fetcher = useFetcher();
  const { info, error } = useAlert();
  const [, copyToClipboard] = useCopyToClipboard();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { settings } = useSettings();

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!onAttachFiles || !event.target.files?.length) {
        return;
      }
      await onAttachFiles(Array.from(event.target.files)).catch((err) =>
        error({ title: "Unable to Attach Files", message: err.message })
      );
    },
    [onAttachFiles, error]
  );

  const handleAttachFiles = useCallback(() => {
    fileInputRef.current?.click();
  }, [fileInputRef]);

  const handleDeleteClick = useCallback(() => {
    if (!chat) {
      return;
    }

    fetcher.submit({}, { method: "post", action: `/c/${chat.id}/delete` });
  }, [chat, fetcher]);

  const handleCopyAsMarkdown = useCallback(() => {
    if (!chat) {
      return;
    }

    const markdown = chat.toMarkdown();
    copyToClipboard(markdown);
    info({
      title: "Chat copied to clipboard as Markdown",
    });
  }, [chat, copyToClipboard, info]);

  const handleCopyAsJson = useCallback(() => {
    if (!chat) {
      return;
    }

    const model = settings.model.name;
    const json = chat.toOpenAiFormat(model);
    copyToClipboard(JSON.stringify(json, null, 2));
    info({
      title: "Chat copied to clipboard as JSON",
    });
  }, [chat, settings, copyToClipboard, info]);

  const handleCopyAsYaml = useCallback(() => {
    if (!chat) {
      return;
    }

    const model = settings.model.name;
    const json = chat.toOpenAiFormat(model);
    copyToClipboard(yaml.stringify(json));
    info({
      title: "Chat copied to clipboard as YAML",
    });
  }, [chat, settings, copyToClipboard, info]);

  const handleDownloadMarkdown = useCallback(() => {
    if (!chat) {
      return;
    }

    const markdown = chat.toMarkdown();
    download(markdown, "message.md", "text/markdown");
    info({
      title: "Exported",
      message: "Chat was exported as a Markdown file",
    });
  }, [info, chat]);

  const handleDownloadJson = useCallback(() => {
    if (!chat) {
      return;
    }

    const model = settings.model.name;
    const json = chat.toOpenAiFormat(model);
    download(JSON.stringify(json, null, 2), "chat.json", "application/json");
    info({
      title: "Exported",
      message: "Chat was exported as an OpenAI formatted JSON file",
    });
  }, [info, settings, chat]);

  const handleDownloadYaml = useCallback(() => {
    if (!chat) {
      return;
    }

    const model = settings.model.name;
    const json = chat.toOpenAiFormat(model);
    download(yaml.stringify(json), "chat.yaml", "application/yaml");
    info({
      title: "Exported",
      message: "Chat was exported as an OpenAI formatted YAML file",
    });
  }, [info, settings, chat]);

  return (
    <Menu
      isDisabled={isDisabled}
      menuButton={
        iconOnly ? (
          <IconButton
            aria-label="Options menu"
            isDisabled={isDisabled}
            size="md"
            fontSize="1.25rem"
            variant="outline"
            icon={<PiGearBold />}
            isRound
          />
        ) : (
          <Button isDisabled={isDisabled} size="sm" variant={variant} leftIcon={<PiGearBold />}>
            Options
          </Button>
        )
      }
    >
      <MenuItemLink to="/new">Clear</MenuItemLink>
      <MenuItemLink to="/new" target="_blank">
        New Window
      </MenuItemLink>

      {!!forkUrl && (
        <MenuItemLink to={forkUrl} target="_blank">
          Duplicate...
        </MenuItemLink>
      )}

      <MenuDivider />
      <SubMenu label="Copy" icon={<TbCopy />}>
        <MenuItem isDisabled={!chat} onClick={() => handleCopyAsMarkdown()}>
          Copy as Markdown
        </MenuItem>
        <MenuItem isDisabled={!chat} onClick={() => handleCopyAsJson()}>
          Copy as JSON
        </MenuItem>
        <MenuItem isDisabled={!chat} onClick={() => handleCopyAsYaml()}>
          Copy as YAML
        </MenuItem>
      </SubMenu>
      <SubMenu label="Export" icon={<TbDownload />}>
        <MenuItem isDisabled={!chat} onClick={handleDownloadMarkdown}>
          Export as Markdown
        </MenuItem>
        <MenuItem isDisabled={!chat} onClick={handleDownloadJson}>
          Export as JSON
        </MenuItem>
        <MenuItem isDisabled={!chat} onClick={handleDownloadYaml}>
          Export as YAML
        </MenuItem>
      </SubMenu>
      <ShareMenuItem chat={chat} />
      <MenuDivider />
      {!!onAttachFiles && (
        <>
          <Input
            multiple
            type="file"
            ref={fileInputRef}
            hidden
            onChange={handleFileChange}
            accept="image/*,text/*,.pdf,application/pdf,*.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.json,application/json,application/markdown"
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
    </Menu>
  );
}

export default OptionsButton;
