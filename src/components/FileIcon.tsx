import {
  Box,
  Editable,
  EditablePreview,
  EditableInput,
  Flex,
  IconButton,
  Text,
  Tooltip,
  useColorModeValue,
} from "@chakra-ui/react";
import { IconType } from "react-icons";
import { IoClose } from "react-icons/io5";
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
import { ChatCraftChat } from "../lib/ChatCraftChat";
import { downloadFile, removeFile, renameFile } from "../lib/fs";
import { formatFileSize } from "../lib/utils";
import { IoMdDownload } from "react-icons/io";

// File icon map moved to the new component
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
  jsonl: BsFiletypeJson,
  md: BsFiletypeMd,
};

type FileIconProps = {
  file: {
    id: string;
    name: string;
    size: number;
  };
  chat: ChatCraftChat;
  onRefresh: () => void;
  fileInputRef?: React.RefObject<HTMLInputElement>;
  totalFiles: number;
  onClose: () => void;
};

const FileIcon = ({ file, chat, onRefresh, fileInputRef, totalFiles, onClose }: FileIconProps) => {
  const hoverBg = useColorModeValue("gray.300", "gray.600");

  // Moved the fileIcon function into the component
  const fileIcon = (name: string) => {
    const extension = name.split(".").pop()?.toLowerCase() || "";
    const IconComponent = FILE_ICON_MAP[extension] || BsFileEarmark;
    return <IconComponent size="80px" />;
  };

  return (
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
        "& .hover-buttons": {
          opacity: 1,
          transform: "translateY(0)",
        },
        bg: hoverBg,
      }}
      transition="all 0.2s ease-in-out"
    >
      <Box position="absolute" top="40%" left="50%" transform="translate(-50%, -50%)" opacity="0.7">
        {fileIcon(file.name)}
      </Box>
      <Flex
        className="hover-buttons"
        position="absolute"
        top="4"
        right="4"
        gap={2}
        opacity={0}
        transition="all 0.2s ease-in-out"
      >
        <Tooltip label="Delete File">
          <IconButton
            aria-label="Remove file"
            icon={<IoClose />}
            size="sm"
            variant="ghost"
            onClick={async () => {
              await removeFile(file.name, chat);

              if (totalFiles == 1 && fileInputRef?.current) {
                fileInputRef.current.value = "";
                onClose();
              }

              await onRefresh();
            }}
          />
        </Tooltip>
      </Flex>
      <Flex
        className="hover-buttons"
        position="absolute"
        top="4"
        left="4"
        gap={2}
        opacity={0}
        transition="all 0.2s ease-in-out"
      >
        <Tooltip label="Download File">
          <IconButton
            aria-label="Download File"
            icon={<IoMdDownload />}
            size="sm"
            variant="ghost"
            onClick={async () => {
              await downloadFile(file.name, chat);
            }}
          />
        </Tooltip>
      </Flex>
      <Box position="absolute" bottom={6} width="full" textAlign="center">
        <Tooltip label="Edit Name">
          <Editable
            defaultValue={file.name}
            mx="auto"
            w="90%"
            onSubmit={async (newVal) => {
              await renameFile(file.name, newVal, chat);
              await onRefresh();
            }}
          >
            <EditablePreview
              fontSize="sm"
              color="blue.300"
              noOfLines={1}
              px={2}
              cursor="pointer"
              textOverflow="ellipsis"
              overflow="hidden"
              whiteSpace="nowrap"
            />
            <EditableInput
              fontSize="sm"
              color="blue.300"
              px={2}
              textOverflow="ellipsis"
              overflow="hidden"
              whiteSpace="nowrap"
            />
          </Editable>
        </Tooltip>
        <Text fontSize="xs" color="gray.400">
          {formatFileSize(file.size)}
        </Text>
      </Box>
    </Box>
  );
};

export default FileIcon;
