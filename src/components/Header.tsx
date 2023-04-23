import {
  ButtonGroup,
  Flex,
  IconButton,
  useColorMode,
  useColorModeValue,
  useDisclosure,
} from "@chakra-ui/react";
import { BiSun, BiMoon } from "react-icons/bi";
import { BsPersonGear } from "react-icons/bs";

import PreferencesModal from "./PreferencesModal";

function Header() {
  const { toggleColorMode } = useColorMode();
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <Flex
      w="100%"
      bg={useColorModeValue("white", "gray.700")}
      justifyContent="end"
      borderBottom="1px"
      borderColor={useColorModeValue("gray.200", "gray.500")}
    >
      <ButtonGroup isAttached pr={2}>
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
