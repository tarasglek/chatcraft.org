import { ButtonGroup, IconButton } from "@chakra-ui/react";
import { CgChevronUpO, CgChevronDownO } from "react-icons/cg";

type PromptIconsProps = {
  isExpanded: boolean;
  toggleExpanded: () => void;
};

function PromptIcons({ isExpanded, toggleExpanded }: PromptIconsProps) {
  return (
    <ButtonGroup pos="absolute" right="2" top="0" zIndex="500" isAttached>
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
