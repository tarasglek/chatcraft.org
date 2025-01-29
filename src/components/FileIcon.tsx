import { Box, Flex, IconButton, Text, Tooltip, useColorModeValue } from "@chakra-ui/react";
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
import { downloadFile, removeFile } from "../lib/fs";
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
};

const FileIcon = ({ file, chat, onRefresh }: FileIconProps) => {
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
              onRefresh();
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
              onRefresh();
            }}
          />
        </Tooltip>
      </Flex>
      <Box position="absolute" bottom={6} width="full" textAlign="center">
        <Tooltip label="Download File">
          <Text
            color="blue.300"
            fontSize="sm"
            mb={1}
            noOfLines={1}
            px={2}
            onClick={async (e) => {
              e.preventDefault();
              await downloadFile(file.name, chat);
            }}
            cursor="pointer"
          >
            {file.name}
          </Text>
        </Tooltip>
        <Text fontSize="xs" color="gray.400">
          {formatFileSize(file.size)}
        </Text>
      </Box>
    </Box>
  );
};

export default FileIcon;
