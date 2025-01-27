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
  Flex,
} from "@chakra-ui/react";
import { FaPaperclip } from "react-icons/fa";
import { IconType } from "react-icons";
import {
  BsFiletypeJpg,
  BsFiletypeCsv,
  BsFiletypeDoc,
  BsFiletypePdf,
  BsFiletypePng,
  BsFiletypeXls,
  BsFiletypeTxt,
  BsFiletypeJson,
  BsFiletypeMd,
  BsFiletypeSvg,
  BsFileEarmark,
} from "react-icons/bs";
import { ChatCraftChat } from "../../lib/ChatCraftChat";
import { useFiles } from "../../hooks/use-fs";
import { removeFile, downloadFile } from "../../lib/fs";
import { FaDownload, FaTrash, FaPlus } from "react-icons/fa";

type PaperClipProps = {
  chat: ChatCraftChat;
  onAttachFiles?: (files: File[]) => Promise<void>;
};

export default function PaperClipIcon({ chat }: PaperClipProps) {
  const { files, loading, error } = useFiles(chat);
  const isAttached = files.length ? true : false;
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handlePaperClipToggle = () => {
    onOpen();
  };

  // File icon map to use proper file icon based on extension
  const FILE_ICON_MAP: Record<string, IconType> = {
    // Images
    jpg: BsFiletypeJpg,
    jpeg: BsFiletypeJpg,
    png: BsFiletypePng,
    svg: BsFiletypeSvg,
    // Documents
    doc: BsFiletypeDoc,
    docx: BsFiletypeDoc,
    pdf: BsFiletypePdf,
    txt: BsFiletypeTxt,
    // Spreadsheets
    csv: BsFiletypeCsv,
    xls: BsFiletypeXls,
    xlsx: BsFiletypeXls,
    // Code
    json: BsFiletypeJson,
    md: BsFiletypeMd,
  };

  // Generates file icons based on file extension
  const fileIcon = (name: string) => {
    const extension = name.split(".").pop()?.toLowerCase() || "";
    const IconComponent = FILE_ICON_MAP[extension] || BsFileEarmark;
    return <IconComponent size="80px" />;
  };

  // File size formator, generates file format
  const formatFileSize = (bytes: number) => {
    // If file less than 1MB, show in KB
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    // If file 1MB or more show in MB
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  // plus button hover-effect helpers
  const SLIDE_DISTANCE = "100%";
  const ANIMATION_DURATION = "0.3s";

  return (
    <Box
      position="relative"
      display="inline-block"
      _hover={{
        "& .plus-button": {
          transform: `translateX(-${SLIDE_DISTANCE})`,
          opacity: 1,
        },
      }}
    >
      <Tooltip label={isAttached ? "Add More Files" : "Attach One Or More Files"}>
        <IconButton
          className="plus-button"
          aria-label="Add file"
          icon={<FaPlus />}
          isRound
          variant="ghost"
          size="md"
          position="absolute"
          right="0"
          opacity="0"
          transform={`translateX(${SLIDE_DISTANCE})`}
          transition={`all ${ANIMATION_DURATION} ease-in-out`}
        />
      </Tooltip>
      <Tooltip label={isAttached ? "View Attached Files" : "Please Attach Files. Nothing To View"}>
        <IconButton
          isRound
          isDisabled={!isAttached}
          icon={<FaPaperclip />}
          variant="ghost"
          size="md"
          fontSize="1rem"
          transition={"all 150ms ease-in-out"}
          onClick={handlePaperClipToggle}
          aria-label=""
        />
      </Tooltip>
      <Modal isCentered onClose={onClose} isOpen={isOpen}>
        <ModalOverlay />
        <ModalContent maxW="900px" w="90vw" p={4}>
          <ModalHeader>Attached Files</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {loading ? (
              <Text>Loading Files...</Text>
            ) : error ? (
              <Text color="red.500">Error loading files!</Text>
            ) : (
              <SimpleGrid columns={3} spacing={6} width="full">
                {files.map((file) => (
                  <Box
                    key={file.id}
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
                    _hover={{
                      borderColor: "blue.500",
                      bg: "gray",
                      "& .hover-buttons": {
                        opacity: 1,
                        transform: "translateY(0)",
                      },
                    }}
                    transition="all 0.2s ease-in-out"
                  >
                    <Box
                      position="absolute"
                      top="40%"
                      left="50%"
                      transform="translate(-50%, -50%)"
                      opacity="0.7"
                    >
                      {fileIcon(file.name)}
                    </Box>
                    <Flex
                      className="hover-buttons"
                      position="absolute"
                      top="4"
                      right="4"
                      gap={2}
                      opacity={0}
                      transform="translateY(-10px)"
                      transition="all 0.2s ease-in-out"
                    >
                      <Tooltip label="Download File">
                        <IconButton
                          aria-label="Download file"
                          icon={<FaDownload />}
                          size="sm"
                          colorScheme="blue"
                          variant="ghost"
                          onClick={() => downloadFile(file.name, chat)}
                          _hover={{ bg: "blue.100" }}
                        />
                      </Tooltip>
                      <Tooltip label="Delete File">
                        <IconButton
                          aria-label="Remove file"
                          icon={<FaTrash />}
                          size="sm"
                          colorScheme="red"
                          variant="ghost"
                          onClick={() => removeFile(file.name, chat)}
                          _hover={{ bg: "red.100" }}
                        />
                      </Tooltip>
                    </Flex>
                    <Box position="absolute" bottom={6} width="full" textAlign="center">
                      <Text fontSize="sm" mb={1} noOfLines={1} px={2}>
                        {file.name}
                      </Text>
                      <Text fontSize="xs" color="gray.400">
                        {formatFileSize(file.size)}
                      </Text>
                    </Box>
                  </Box>
                ))}
              </SimpleGrid>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
