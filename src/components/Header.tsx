import {
  ButtonGroup,
  Flex,
  IconButton,
  Link,
  Text,
  useColorMode,
  useColorModeValue,
  useDisclosure,
} from "@chakra-ui/react";
import { BiSun, BiMoon } from "react-icons/bi";
import { BsPersonGear, BsGithub } from "react-icons/bs";

import PreferencesModal from "./PreferencesModal";

function Header() {
  const { toggleColorMode } = useColorMode();
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <Flex
      w="100%"
      bg={useColorModeValue("white", "gray.700")}
      justify="space-between"
      align="center"
      borderBottom="1px"
      borderColor={useColorModeValue("gray.200", "gray.500")}
    >
      <Text pl={4} fontWeight="bold" color={useColorModeValue("blue.600", "blue.200")}>
        <Link href="/">&lt;ChatCraft /&gt;</Link>
      </Text>
      <ButtonGroup isAttached pr={2}>
        <IconButton
          as="a"
          href="https://github.com/tarasglek/chatcraft.org"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub Repository"
          title="GitHub Repository"
          icon={<BsGithub />}
          variant="ghost"
        />
        <IconButton
          aria-label={useColorModeValue("Switch to Dark Mode", "Switch to Light Mode")}
          title={useColorModeValue("Switch to Dark Mode", "Switch to Light Mode")}
          icon={useColorModeValue(<BiMoon />, <BiSun />)}
          variant="ghost"
          onClick={toggleColorMode}
        />
        <IconButton
          aria-label="User Settings"
          title="User Settings"
          icon={<BsPersonGear />}
          variant="ghost"
          onClick={onOpen}
        />
        <PreferencesModal isOpen={isOpen} onClose={onClose} />
      </ButtonGroup>
    </Flex>
  );
}

export default Header;
