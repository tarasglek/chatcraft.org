import {
  Box,
  Flex,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Divider,
  ListItem,
  List,
  useColorMode,
  useMediaQuery,
  Accordion,
  AccordionIcon,
  AccordionButton,
  AccordionItem,
  AccordionPanel,
} from "@chakra-ui/react";
import { RefObject, useState } from "react";
import ModelsSettings from "./ModelsSettings";
import WebHandlersConfig from "./WebHandlersConfig";
import DefaultSystemPrompt from "./DefaultSystemPrompt";
import CustomizationSettings from "./CustomizationSettings";
import { MdOutlineDashboardCustomize, MdSignalCellularAlt } from "react-icons/md";
import { IconType } from "react-icons";
import { TbPrompt } from "react-icons/tb";
import { FaRobot } from "react-icons/fa";

type PreferencesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  finalFocusRef?: RefObject<HTMLTextAreaElement>;
};

interface Setting {
  name: string;
  icon: IconType;
}

function PreferencesModal({ isOpen, onClose, finalFocusRef }: PreferencesModalProps) {
  const isDarkMode = useColorMode().colorMode === "dark";

  const [selectedSetting, setSelectedSetting] = useState<Setting>({
    name: "Models",
    icon: FaRobot,
  });

  const settings: Setting[] = [
    { name: "Models", icon: FaRobot },
    { name: "System Prompt", icon: TbPrompt },
    { name: "Web Handlers", icon: MdSignalCellularAlt },
    { name: "Customization", icon: MdOutlineDashboardCustomize },
  ];

  const handleSettingClick = (setting: Setting) => {
    setSelectedSetting(setting);
  };

  const getHoverStyle = (setting: Setting) => {
    if (selectedSetting.name !== setting.name) {
      return {
        bg: isDarkMode ? "gray.600" : "gray.200",
      };
    }
  };

  const getColorStyle = (setting: Setting) => {
    if (selectedSetting.name === setting.name) {
      return isDarkMode ? "black" : "white";
    }
  };

  const getBackgroundStyle = (setting: Setting) => {
    if (selectedSetting.name === setting.name) {
      return isDarkMode ? "blue.200" : "blue.500";
    }
  };

  const [isSmallViewport] = useMediaQuery("(max-width: 600px)");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={isSmallViewport ? "full" : "xl"}
      finalFocusRef={finalFocusRef}
    >
      <ModalOverlay />
      <ModalContent top={isSmallViewport ? "0" : "-2rem"} maxWidth="54rem">
        <Flex alignItems="center" justifyContent="space-between" width="100%">
          <ModalHeader style={{ whiteSpace: "nowrap" }}>User Settings</ModalHeader>
          <ModalCloseButton position="relative" top={0} right={0} mx="1rem" />
        </Flex>
        {!isSmallViewport && <Divider />}
        <Flex flexDirection={isSmallViewport ? "column" : "row"}>
          {isSmallViewport ? (
            <Accordion allowToggle>
              <AccordionItem px="0.25rem" py="0.75rem">
                <AccordionButton
                  pl="1.25rem"
                  justifyContent={"space-between"}
                  _hover={{ bg: isDarkMode ? "grey.500" : "white" }}
                >
                  <Flex alignItems="center">
                    <Box mr={4}>
                      <selectedSetting.icon />
                    </Box>
                    {selectedSetting.name}
                  </Flex>
                  <AccordionIcon boxSize="1.5rem" />
                </AccordionButton>
                <AccordionPanel pb="0">
                  <List spacing={1.5}>
                    {settings.map((setting, index) => (
                      <ListItem
                        mx="0.25rem"
                        tabIndex={0}
                        key={index}
                        onClick={() => handleSettingClick(setting)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleSettingClick(setting);
                          }
                        }}
                        cursor="pointer"
                        _hover={getHoverStyle(setting)}
                        p={1}
                        pl={2}
                        borderRadius="md"
                        color={getColorStyle(setting)}
                        bg={getBackgroundStyle(setting)}
                      >
                        <AccordionButton>
                          <Flex alignItems="center">
                            <Box mr={4}>
                              <setting.icon />
                            </Box>
                            {setting.name}
                          </Flex>
                        </AccordionButton>
                      </ListItem>
                    ))}
                  </List>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          ) : (
            <Box p={4} pr={isSmallViewport ? "4" : "0"} fontSize="m" minWidth="14rem">
              <List spacing={1}>
                {settings.map((setting, index) => (
                  <ListItem
                    tabIndex={0}
                    key={index}
                    onClick={() => handleSettingClick(setting)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSettingClick(setting);
                      }
                    }}
                    cursor="pointer"
                    _hover={getHoverStyle(setting)}
                    p={2}
                    ps={4}
                    borderRadius="md"
                    color={getColorStyle(setting)}
                    bg={getBackgroundStyle(setting)}
                  >
                    <Flex alignItems="center">
                      <Box mr={4}>
                        <setting.icon />
                      </Box>
                      {setting.name}
                    </Flex>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
          {selectedSetting.name === "Models" && <ModelsSettings isOpen={isOpen} />}
          {selectedSetting.name === "Web Handlers" && <WebHandlersConfig />}
          {selectedSetting.name === "System Prompt" && <DefaultSystemPrompt />}
          {selectedSetting.name === "Customization" && <CustomizationSettings />}
        </Flex>

        <ModalFooter></ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default PreferencesModal;
