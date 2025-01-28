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
  Box,
  Text,
  SimpleGrid,
  Input,
} from "@chakra-ui/react";
import { FaPaperclip } from "react-icons/fa";
import { ChatCraftChat } from "../../lib/ChatCraftChat";
import { useFiles } from "../../hooks/use-fs";
import { useAlert } from "../../hooks/use-alert";
import { useCallback, useRef } from "react";
import { acceptableFileFormats } from "../../lib/utils";
import FileIcon from "../FileIcon";
import { BsFileEarmarkPlus } from "react-icons/bs";

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
          <ModalHeader>You Have {files.length} Attached Files</ModalHeader>
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
                <Box
                  p={6}
                  borderWidth="1px"
                  borderRadius="md"
                  minW="200px"
                  maxW="200px"
                  h="200px"
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="space-between"
                  aspectRatio="1"
                  position="relative"
                  onClick={handleAttachFiles}
                  _hover={{
                    borderColor: "blue.500",
                    bg: "gray",
                    "& .hover-buttons": {
                      opacity: 1,
                      transform: "translateY(0)",
                    },
                  }}
                  transform="all 0.2s ease-in-out"
                >
                  <Box
                    position="absolute"
                    top="40%"
                    left="50%"
                    transform="translate(-50%, -50%)"
                    opacity="0.7"
                  >
                    <BsFileEarmarkPlus size="80px" />
                  </Box>
                  <Box position="absolute" bottom={6} width="full" textAlign="center">
                    <Text fontSize="sm" mb={1} noOfLines={1} px={2}>
                      Attach Files...
                    </Text>
                  </Box>
                </Box>
                {files.map((file) => (
                  <FileIcon key={file.id} file={file} chat={chat} onRefresh={refreshFiles} />
                ))}
              </SimpleGrid>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
export default PaperclipIcon;
