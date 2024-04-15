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
  const { colorMode } = useColorMode();
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

  const [isSmallViewport] = useMediaQuery("(max-width: 600px)");

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" finalFocusRef={finalFocusRef}>
      <ModalOverlay />
      <ModalContent top="-2rem" maxWidth="54rem">
        <ModalHeader ps={8}>User Settings</ModalHeader>
        <Divider />
        <ModalCloseButton mt="0.5rem" />
        <Flex flexDirection={isSmallViewport ? "column" : "row"}>
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
                  _hover={{
                    bg:
                      selectedSetting.name === setting.name
                        ? "gray.500"
                        : colorMode === "dark"
                          ? "gray.600"
                          : "gray.100",
                  }}
                  p={2}
                  ps={4}
                  borderRadius="md"
                  color={selectedSetting.name === setting.name ? "white" : "inherit"}
                  bg={selectedSetting.name === setting.name ? "gray.500" : "transparent"}
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
          {isSmallViewport && <Divider />}
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
