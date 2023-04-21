import { ButtonGroup, IconButton, useColorMode, useColorModeValue } from "@chakra-ui/react";
import { CgChevronUpO, CgChevronDownO } from "react-icons/cg";
import { BiSun, BiMoon } from "react-icons/bi";

type PromptIconsProps = {
  isExpanded: boolean;
  toggleExpanded: () => void;
};

function PromptIcons({ isExpanded, toggleExpanded }: PromptIconsProps) {
  const { toggleColorMode } = useColorMode();

  return (
    <ButtonGroup pos="absolute" right="0" top="0" zIndex="500" isAttached>
      <IconButton
        aria-label={useColorModeValue("Switch to Dark Mode", "Switch to Light Mode")}
        title={useColorModeValue("Switch to Dark Mode", "Switch to Light Mode")}
        icon={useColorModeValue(<BiMoon />, <BiSun />)}
        variant="ghost"
        onClick={toggleColorMode}
      />

      <IconButton
        aria-label={isExpanded ? "Minimize prompt area" : "Maximize prompt area"}
        title={isExpanded ? "Minimize prompt area" : "Maximize prompt area"}
        icon={isExpanded ? <CgChevronDownO /> : <CgChevronUpO />}
        variant="ghost"
        onClick={toggleExpanded}
      />
    </ButtonGroup>
  );
}

export default PromptIcons;
