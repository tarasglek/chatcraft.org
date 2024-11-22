import {
  Box,
  Flex,
  Separator as Divider,
  List,
  useMediaQuery,
  Button,
  HStack,
} from "@chakra-ui/react";

import { AccordionItemTrigger, AccordionRoot } from "../ui/accordion";

import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogHeader,
  DialogRoot,
  DialogTrigger,
  DialogBackdrop,
} from "../ui/dialog";

import { useTheme } from "next-themes";

import { RefObject, useRef, useState } from "react";
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
  onClose?: () => void;
  finalFocusRef?: RefObject<HTMLTextAreaElement>;
};

interface Setting {
  name: string;
  icon: IconType;
}

function PreferencesModal({ isOpen, onClose }: PreferencesModalProps) {
  const { theme } = useTheme();
  const bgDark = theme === "dark" ? "gray.800" : "white";
  const bgBlue = theme === "dark" ? "blue.200" : "blue.500";
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

  const modelRef = useRef<HTMLDivElement>(null);

  const handleSettingClick = (setting: Setting) => {
    setSelectedSetting(setting);
  };

  const getHoverStyle = (setting: Setting) => {
    if (selectedSetting.name !== setting.name) {
      return {
        bg: bgDark,
      };
    } else {
      return { bg: bgBlue };
    }
  };

  const getColorStyle = (setting: Setting) => {
    if (selectedSetting.name === setting.name) {
      return bgDark;
    } else {
      return "inherit";
    }
  };

  const getBackgroundStyle = (setting: Setting) => {
    if (selectedSetting.name === setting.name) {
      return bgBlue;
    } else {
      return "inherit";
    }
  };

  const [isSmallViewport] = useMediaQuery(["(max-width: 600px)"], {
    ssr: false,
  });

  const MobileSettingsAccordion = () => {
    return (
      <AccordionRoot collapsible px="0.25rem" py="0.75rem">
        <AccordionItemTrigger indicatorPlacement="start">
          <Box>
            <Button pl="1.25rem" justifyContent={"space-between"} _hover={{ bg: bgDark }}>
              <>
                <Flex alignItems="center">
                  <Box mr={4}>
                    <selectedSetting.icon />
                  </Box>
                  {selectedSetting.name}
                </Flex>
              </>
            </Button>
          </Box>
        </AccordionItemTrigger>
        <List.Root
          css={{
            spaceX: 1,
            spaceY: 1,
          }}
        >
          {settings.map((setting, index) => (
            <List.Item key={index} cursor="pointer" p={0.75}>
              <Button
                borderRadius="md"
                _hover={getHoverStyle(setting)}
                color={getColorStyle(setting)}
                bg={getBackgroundStyle(setting)}
                onClick={() => handleSettingClick(setting)}
              >
                <>
                  <Flex alignItems="center">
                    <Box mr={4}>
                      <setting.icon />
                    </Box>
                    {setting.name}
                  </Flex>
                </>
              </Button>
            </List.Item>
          ))}
        </List.Root>
      </AccordionRoot>
    );
  };

  const DesktopSettingsList = () => {
    return (
      <Box p={4} fontStyle="normal" minWidth="16rem">
        <List.Root
          css={{
            spaceX: 1,
            spaceY: 1,
          }}
          variant={"plain"}
        >
          {settings.map((setting, index) => (
            <List.Item
              key={index}
              cursor="pointer"
              p={0.5}
              alignContent={"start"}
              alignItems={"start"}
            >
              <HStack width="100%">
                <Button
                  borderRadius="md"
                  fontWeight="400"
                  width="100%"
                  alignContent={"start"}
                  alignItems={"center"}
                  justifyContent="flex-start"
                  _hover={getHoverStyle(setting)}
                  color={getColorStyle(setting)}
                  bg={getBackgroundStyle(setting)}
                  onClick={() => handleSettingClick(setting)}
                  _active={{
                    bg: bgDark,
                  }}
                >
                  <HStack>
                    <setting.icon />
                    {setting.name}
                  </HStack>
                </Button>
              </HStack>
            </List.Item>
          ))}
        </List.Root>
      </Box>
    );
  };

  return (
    <DialogRoot
      lazyMount
      open={isOpen}
      onOpenChange={onClose}
      size={isSmallViewport ? "full" : "xl"}
      scrollBehavior={"inside"}
    >
      <DialogBackdrop />
      <DialogContent
        top={isSmallViewport ? "0" : "-2rem"}
        maxWidth={"8xl"}
        mx={10}
        maxHeight="auto"
        ref={modelRef}
      >
        <Flex alignItems="center" justifyContent="space-between" width="100%">
          <DialogHeader whiteSpace="nowrap">User Settings</DialogHeader>
        </Flex>
        {!isSmallViewport && <Divider />}
        <DialogBody alignItems={"center"}>
          <HStack width="100%" alignItems="flex-start" spaceX={0}>
            {isSmallViewport ? <MobileSettingsAccordion /> : <DesktopSettingsList />}
            <Box overflowY="auto" px={8} py={3} flex="1">
              {selectedSetting.name === "Models" && (
                <ModelsSettings isOpen={isOpen} modelRef={modelRef} />
              )}
              {selectedSetting.name === "System Prompt" && <DefaultSystemPrompt />}
              {selectedSetting.name === "Web Handlers" && <WebHandlersConfig />}
              {selectedSetting.name === "Customization" && <CustomizationSettings />}
            </Box>
          </HStack>
        </DialogBody>
        <DialogCloseTrigger onClick={onClose} />
      </DialogContent>
    </DialogRoot>
  );
}

export default PreferencesModal;
