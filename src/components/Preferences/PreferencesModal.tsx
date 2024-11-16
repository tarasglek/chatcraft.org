import {
  Box,
  Flex,
  Modal,
  ModalCloseButton,
  ModalContent,
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
  Button,
  ModalBody,
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
    } else {
      return { bg: isDarkMode ? "blue.200" : "blue.500" };
    }
  };

  const getColorStyle = (setting: Setting) => {
    if (selectedSetting.name === setting.name) {
      return isDarkMode ? "black" : "white";
    } else {
      return "inherit";
    }
  };

  const getBackgroundStyle = (setting: Setting) => {
    if (selectedSetting.name === setting.name) {
      return isDarkMode ? "blue.200" : "blue.500";
    } else {
      return "inherit";
    }
  };

  const [isSmallViewport] = useMediaQuery("(max-width: 600px)");

  const MobileSettingsAccordion = () => {
    return (
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
          <AccordionPanel pb="0.25rem">
            <List spacing={1}>
              {settings.map((setting, index) => (
                <ListItem key={index} cursor="pointer" p={0.75}>
                  <AccordionButton
                    borderRadius="md"
                    _hover={getHoverStyle(setting)}
                    color={getColorStyle(setting)}
                    bg={getBackgroundStyle(setting)}
                    onClick={() => handleSettingClick(setting)}
                  >
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
    );
  };

  const DesktopSettingsList = () => {
    return (
      <Box p={4} pr="0" fontSize="m" minWidth="14rem">
        <List spacing={1}>
          {settings.map((setting, index) => (
            <ListItem key={index} cursor="pointer" p={0.75}>
              <Button
                borderRadius="md"
                fontWeight="400"
                width="100%"
                justifyContent="left"
                _hover={getHoverStyle(setting)}
                color={getColorStyle(setting)}
                bg={getBackgroundStyle(setting)}
                onClick={() => handleSettingClick(setting)}
                _active={{
                  bg: isDarkMode ? "grey.500" : "grey.200",
                }}
              >
                <Flex alignItems="center">
                  <Box mr={4}>
                    <setting.icon />
                  </Box>
                  {setting.name}
                </Flex>
              </Button>
            </ListItem>
          ))}
        </List>
      </Box>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={isSmallViewport ? "full" : "xl"}
      finalFocusRef={finalFocusRef}
      scrollBehavior="inside"
      allowPinchZoom={true}
      blockScrollOnMount={false}
    >
      <ModalOverlay />
      <ModalContent top={isSmallViewport ? "0" : "-2rem"} maxWidth="54rem" maxHeight="90vh">
        <Flex alignItems="center" justifyContent="space-between" width="100%">
          <ModalHeader whiteSpace="nowrap">User Settings</ModalHeader>
          <ModalCloseButton position="relative" top={0} right={0} mx="1rem" />
        </Flex>
        {!isSmallViewport && <Divider />}
        <ModalBody p={0} display="flex" h="95vh">
          <Flex flexDirection={isSmallViewport ? "column" : "row"} w="100%">
            {isSmallViewport ? <MobileSettingsAccordion /> : <DesktopSettingsList />}
            <Box overflowY="auto" px={8} py={3}>
              {selectedSetting.name === "Models" && <ModelsSettings isOpen={isOpen} />}
              {selectedSetting.name === "System Prompt" && <DefaultSystemPrompt />}
              {selectedSetting.name === "Web Handlers" && <WebHandlersConfig />}
              {selectedSetting.name === "Customization" && <CustomizationSettings />}
            </Box>
          </Flex>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

export default PreferencesModal;
