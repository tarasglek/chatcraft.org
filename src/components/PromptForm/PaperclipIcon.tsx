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
import { useCallback, useRef } from "react";
import { acceptableFileFormats } from "../../lib/utils";
import FileIcon from "../FileIcon";
import { FaFileUpload } from "react-icons/fa";
import { removeFile } from "../../lib/fs";

type PaperClipProps = {
  chat: ChatCraftChat;
  onAttachFiles?: (files: File[]) => Promise<void>;
};

function PaperclipIcon({ chat, onAttachFiles }: PaperClipProps) {
  const { files, loading, error, refreshFiles } = useFiles(chat);
  const isAttached = files.length ? true : false;
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { error: alertError } = useAlert();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!onAttachFiles || !event.target.files?.length) {
        return;
      }
      await onAttachFiles(Array.from(event.target.files))
        .then(() => refreshFiles)
        .catch((err) => alertError({ title: "Unable to Attach Files", message: err.message }));
    },
    [onAttachFiles, alertError, refreshFiles]
  );

  const handleAttachFiles = useCallback(() => {
    fileInputRef.current?.click();
  }, [fileInputRef]);

  const handlePaperClipToggle = () => {
    onOpen();
  };

  const handleDeleteAll = () => {
    files.map((file) => {
      removeFile(file.name, chat);
    });
  };

  return (
    <>
      <Tooltip label="Attach Files..." placement="top">
        {!isAttached && (
          <Input
            multiple
            type="file"
            ref={fileInputRef}
            hidden
            onChange={handleFileChange}
            accept={acceptableFileFormats}
          />
        )}
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
                <Input
                  multiple
                  type="file"
                  ref={fileInputRef}
                  hidden
                  onChange={handleFileChange}
                  accept={acceptableFileFormats}
                />
                {files.map((file) => (
                  <FileIcon key={file.id} file={file} chat={chat} onRefresh={refreshFiles} />
                ))}
              </SimpleGrid>
            )}
          </ModalBody>
          <ModalFooter gap={2}>
            <Button gap={2} onClick={handleAttachFiles} maxH="30px">
              Add Files
              <FaFileUpload />
            </Button>
            <Button onClick={handleDeleteAll} maxH="30">
              Delete All
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
export default PaperclipIcon;
