import { IconButton, Input, useDisclosure, Separator, VStack, HStack } from "@chakra-ui/react";
import { Button } from "./ui/button";
import { MenuContent, MenuItem, MenuRoot, MenuTrigger, MenuTriggerItem } from "./ui/menu";
import { useFetcher } from "react-router-dom";
import { TbShare3, TbTrash, TbCopy, TbDownload } from "react-icons/tb";
import { PiGearBold } from "react-icons/pi";
import { BsPaperclip } from "react-icons/bs";
import { useCallback, useRef } from "react";
import { useCopyToClipboard } from "react-use";
import * as yaml from "yaml";

import { ChatCraftChat } from "../lib/ChatCraftChat";
import { useAlert } from "../hooks/use-alert";
import { useSettings } from "../hooks/use-settings";
import ShareModal from "./ShareModal";
import { download } from "../lib/utils";
//import { Menu } from "@szhsin/react-menu";
//import { Menu, MenuDivider, MenuItem, MenuItemLink, SubMenu } from "./Menu";

function ShareMenuItem({ chat }: { chat: ChatCraftChat }) {
  const { open, onOpen, onClose } = useDisclosure();

  return (
    <>
      <MenuItem onClick={onOpen} value="share-menu" marginTop={"auto"} bottom={0} my={"auto"}>
        <HStack justifyContent={"space-between"}>
          <TbShare3 /> Share Chat
        </HStack>
        <ShareModal chat={chat} isOpen={open} onClose={onClose} />
      </MenuItem>
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
      console.log("event.target.files", event.target.files);
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
    <VStack>
      <MenuRoot>
        <MenuTrigger>
          {iconOnly ? (
            <IconButton
              aria-label="Options menu"
              disabled={!isDisabled}
              size="md"
              fontSize="1.25rem"
              variant="outline"
              borderRadius={4}
            >
              <PiGearBold />
            </IconButton>
          ) : (
            <>
              <Button disabled={isDisabled} size="sm" variant={variant}>
                <>{<PiGearBold />} Options</>
              </Button>
            </>
          )}
        </MenuTrigger>
        <MenuContent textDecoration={"none"} width={"150px"} spaceY={1}>
          <MenuItem value="clear">
            <a href="/new" rel="noreferrer">
              Clear
            </a>
          </MenuItem>
          <MenuItem onClick={() => console.log("New Window")} value="new-window">
            <a href="/new" target="_blank" rel="noreferrer">
              New Window
            </a>
          </MenuItem>
          {!!forkUrl && <MenuItem value="duplicate">Duplicate...</MenuItem>}
          <Separator />
          <MenuRoot positioning={{ placement: "right-start", gutter: 2 }}>
            <MenuTriggerItem value="open-recent" justifyContent={"space-between"}>
              <TbCopy /> Copy
            </MenuTriggerItem>
            <MenuContent>
              <MenuItem onClick={handleCopyAsMarkdown} value="copy-markdown" disabled={!chat}>
                Copy as Markdown
              </MenuItem>
              <MenuItem onClick={handleCopyAsJson} value="copy-json" disabled={!chat}>
                Copy as JSON
              </MenuItem>
              <MenuItem onClick={handleCopyAsYaml} value="copy-yaml" disabled={!chat}>
                Copy as YAML
              </MenuItem>
            </MenuContent>
          </MenuRoot>
          <MenuRoot positioning={{ placement: "right-start", gutter: 2 }}>
            <MenuTriggerItem value="export" justifyContent={"space-between"}>
              <TbDownload /> Export
            </MenuTriggerItem>
            <MenuContent>
              <MenuItem onClick={handleDownloadMarkdown} value="export-markdown" disabled={!chat}>
                Export as Markdown
              </MenuItem>
              <MenuItem onClick={handleDownloadJson} value="export-json" disabled={!chat}>
                Export as JSON
              </MenuItem>
              <MenuItem onClick={handleDownloadYaml} value="export-yaml" disabled={!chat}>
                Export as YAML
              </MenuItem>
            </MenuContent>
          </MenuRoot>
          <Separator />

          {!!chat && <ShareMenuItem chat={chat} />}

          <Separator />
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
              <MenuItem onClick={handleAttachFiles} value="attached_file">
                <HStack>
                  <BsPaperclip /> Attach Files...
                </HStack>
              </MenuItem>
              <Separator />
            </>
          )}
          {!chat?.readonly && (
            <MenuItem
              color="red.400"
              disabled={!chat}
              onClick={() => handleDeleteClick()}
              value="delete-chat"
            >
              <HStack>
                <TbTrash /> Delete Chat
              </HStack>
            </MenuItem>
          )}
        </MenuContent>
      </MenuRoot>
    </VStack>
  );
}

export default OptionsButton;
