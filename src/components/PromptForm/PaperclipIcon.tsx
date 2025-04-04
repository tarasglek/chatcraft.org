import {
  IconButton,
  Modal,
  Tooltip,
  useDisclosure,
  ModalHeader,
  ModalContent,
  ModalOverlay,
  ModalCloseButton,
  ModalBody,
  Text,
  SimpleGrid,
  Input,
  ModalFooter,
  Button,
} from "@chakra-ui/react";
import { FaPaperclip } from "react-icons/fa";
import { ChatCraftChat } from "../../lib/ChatCraftChat";
import { useFiles } from "../../hooks/use-fs";
import { useAlert } from "../../hooks/use-alert";
import { useCallback, useRef, useState } from "react";
import { acceptableFileFormats } from "../../hooks/use-file-import";
import FileIcon from "../FileIcon";
import { removeFile } from "../../lib/fs";
import { generateUniqueFilename } from "../../lib/utils";

type PaperClipProps = {
  chat: ChatCraftChat;
  onAttachFiles?: (files: File[]) => Promise<void>;
};

function PaperclipIcon({ chat, onAttachFiles }: PaperClipProps) {
  const { files, loading, error, refreshFiles } = useFiles(chat);
  const isAttached = files.length ? true : false;
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isErrorOpen, onOpen: onErrorOpen, onClose: onErrorClose } = useDisclosure();
  const { error: alertError } = useAlert();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteError, setDeleteError] = useState<string>("");

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!onAttachFiles || !event.target.files?.length) {
        return;
      }

      const newFiles = Array.from(event.target.files);
      const uniqueFiles = newFiles.map((file) => {
        // Create a new File object with potentially modified name
        const uniqueName = generateUniqueFilename(file.name, files);
        return new File([file], uniqueName, { type: file.type });
      });

      await onAttachFiles(uniqueFiles)
        .then(() => refreshFiles)
        .catch((err) => alertError({ title: "Unable to Attach Files", message: err.message }));
    },
    [onAttachFiles, alertError, refreshFiles, files]
  );

  const handleAttachFiles = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current?.click();
    }
    console.log("fileInputRef: ", fileInputRef.current);
  }, [fileInputRef]);

  const handlePaperClipToggle = () => {
    onOpen();
  };

  const handleDeleteAll = async () => {
    try {
      await Promise.all(files.map((file) => removeFile(file.name, chat)));
      await refreshFiles();
      onClose();

      // Reset file input to insure it's available for future use
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Failed to delete files");
      onErrorOpen();
    }
  };

  return (
    <>
      <Tooltip label="Attach Files..." placement="top">
        <Input
          multiple
          type="file"
          ref={fileInputRef}
          hidden
          onChange={handleFileChange}
          accept={acceptableFileFormats}
        />
        <IconButton
          isRound
          icon={<FaPaperclip />}
          variant="ghost"
          size="md"
          fontSize="1rem"
          transition={"all 150ms ease-in-out"}
          onClick={isAttached ? handlePaperClipToggle : handleAttachFiles}
          aria-label=""
        />
      </Tooltip>
      <Modal isCentered onClose={onClose} isOpen={isOpen}>
        <ModalOverlay />
        <ModalContent maxW="900px" w="90vw" p={4} position="absolute">
          <ModalHeader>{files.length} Attached Files</ModalHeader>
          <ModalCloseButton />
          <ModalBody maxH="70vh" overflowY="auto">
            {loading ? (
              <Text>Loading Files...</Text>
            ) : error ? (
              <Text color="red.500">Error loading files!</Text>
            ) : (
              <SimpleGrid columns={3} spacing={6} width="full">
                {files.map((file) => (
                  <FileIcon
                    key={file.id}
                    file={file}
                    chat={chat}
                    onRefresh={refreshFiles}
                    fileInputRef={fileInputRef}
                    totalFiles={files.length}
                    onClose={onClose}
                  />
                ))}
              </SimpleGrid>
            )}
          </ModalBody>
          <ModalFooter gap={2}>
            <Button
              onClick={handleDeleteAll}
              maxH="30"
              variant="ghost"
              color="red"
              colorScheme="red"
            >
              Remove All
            </Button>
            <Button gap={2} onClick={handleAttachFiles} maxH="30px">
              Add Files
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Error modal */}
      <Modal isCentered isOpen={isErrorOpen} onClose={onErrorClose} size="sm">
        <ModalOverlay backdropFilter="blur(2px)" />
        <ModalContent>
          <ModalHeader
            color="red"
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            Error !
            <ModalCloseButton color="white" />
          </ModalHeader>
          <ModalBody color="red" pb={6}>
            {deleteError}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
export default PaperclipIcon;
