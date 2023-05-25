import { Box, Flex, Input, InputGroup, InputLeftElement, Text } from "@chakra-ui/react";
import { MdOutlineChat } from "react-icons/md";
import { TbSearch } from "react-icons/tb";

function SidebarItem({ title }: { title: string }) {
  return (
    <Flex alignItems="center" gap={2} pr={6}>
      <Box>
        <MdOutlineChat />
      </Box>
      <Box flex={1} maxW="100%">
        <Text
          fontSize="sm"
          title={title}
          overflow="hidden"
          whiteSpace="nowrap"
          textOverflow="ellipsis"
        >
          {title}
        </Text>
      </Box>
    </Flex>
  );
}

function Sidebar() {
  const privateChats = [
    { title: "Update Docker Swarm Replica" },
    { title: "SSL Certificate Type" },
    { title: "Set Task Role Arn." },
    { title: "Empty TXT Records Vaid" },
    { title: "useMemo() in React" },
    { title: "CSS Properties and Chakra-UI" },
    { title: "Shell command syntax" },
    { title: "MJPEG parser in Zig" },
    { title: "Update Docker Swarm Replica" },
    { title: "SSL Certificate Type" },
    { title: "Set Task Role Arn." },
    { title: "Empty TXT Records Vaid" },
    { title: "useMemo() in React" },
    { title: "CSS Properties and Chakra-UI" },
    { title: "Shell command syntax" },
    { title: "MJPEG parser in Zig" },
    { title: "Update Docker Swarm Replica" },
    { title: "SSL Certificate Type" },
    { title: "Set Task Role Arn." },
    { title: "Empty TXT Records Vaid" },
    { title: "useMemo() in React" },
    { title: "CSS Properties and Chakra-UI" },
    { title: "Shell command syntax" },
    { title: "MJPEG parser in Zig" },
    { title: "Update Docker Swarm Replica" },
    { title: "SSL Certificate Type" },
    { title: "Set Task Role Arn." },
    { title: "Empty TXT Records Vaid" },
    { title: "useMemo() in React" },
    { title: "CSS Properties and Chakra-UI" },
    { title: "Shell command syntax" },
    { title: "MJPEG parser in Zig" },
  ];

  return (
    <Box maxH="100%" p={4} overflow="scroll">
      <Box mb={2}>
        <InputGroup size="sm">
          <InputLeftElement pointerEvents="none" color="gray.500">
            <TbSearch />
          </InputLeftElement>
          <Input type="search" />
        </InputGroup>
      </Box>

      <Flex direction="column" gap={2}>
        {privateChats.map(({ title }, index) => (
          <SidebarItem key={index} title={title} />
        ))}
      </Flex>
    </Box>
  );
}

export default Sidebar;
