import { useCallback, type RefObject } from "react";
import {
  Avatar,
  Box,
  ButtonGroup,
  Flex,
  Icon,
  IconButton,
  Input,
  InputGroup,
  Link,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Text,
  useColorMode,
  useColorModeValue,
  useDisclosure,
} from "@chakra-ui/react";
import { BiSun, BiMoon } from "react-icons/bi";
import {
  TbLayoutSidebarRightCollapseFilled,
  TbLayoutSidebarRightExpandFilled,
} from "react-icons/tb";
import { BsGithub } from "react-icons/bs";
import { TbSearch } from "react-icons/tb";
import { Form } from "react-router-dom";

import PreferencesModal from "./PreferencesModal";
import DefaultSystemPromptModal from "./DefaultSystemPromptModal";
import { useUser } from "../hooks/use-user";
import { useSettings } from "../hooks/use-settings";
import useDesktopBreakpoint from "../hooks/use-desktop-breakpoint";

type HeaderProps = {
  chatId?: string;
  inputPromptRef?: RefObject<HTMLTextAreaElement>;
  searchText?: string;
  onToggleSidebar: () => void;
};

function Header({ chatId, inputPromptRef, searchText, onToggleSidebar }: HeaderProps) {
  const { toggleColorMode } = useColorMode();
  const {
    isOpen: isPrefModalOpen,
    onOpen: onPrefModalOpen,
    onClose: onPrefModalClose,
  } = useDisclosure();
  const {
    isOpen: isSysPromptModalOpen,
    onOpen: onSysPromptModalOpen,
    onClose: onSysPromptModalClose,
  } = useDisclosure();
  const { user, login, logout } = useUser();

  const handleLoginLogout = useCallback(() => {
    if (user) {
      logout(chatId);
    } else {
      login(chatId);
    }
  }, [chatId, user, login, logout]);

  const { settings } = useSettings();

  const isDesktop = useDesktopBreakpoint();

  return (
    <Flex
      w="100%"
      gap={1}
      bg={useColorModeValue("white", "gray.700")}
      justify="space-between"
      align="center"
      borderBottom="2px"
      borderColor={useColorModeValue("gray.50", "gray.600")}
    >
      <Flex pl={1} align="center" gap={2}>
        {(!settings.sidebarPinned || !isDesktop) && (
          <IconButton
            icon={
              settings.sidebarVisible ? (
                <Icon boxSize={6} as={TbLayoutSidebarRightExpandFilled} />
              ) : (
                <Icon boxSize={6} as={TbLayoutSidebarRightCollapseFilled} />
              )
            }
            variant="ghost"
            aria-label="Toggle Sidebar Menu"
            title="Toggle Sidebar Menu"
            onClick={onToggleSidebar}
          />
        )}

        <Text
          fontWeight="bold"
          color={useColorModeValue("blue.600", "blue.200")}
          marginInlineStart={settings.sidebarPinned && isDesktop ? 2 : 0}
        >
          <Link
            href="/"
            _hover={{ textDecoration: "none", color: useColorModeValue("blue.400", "blue.100") }}
          >
            &lt;ChatCraft /&gt;
          </Link>
        </Text>
      </Flex>

      <Box flex={1} maxW="500px">
        <Form action="/s" method="get">
          <InputGroup size="sm" variant="outline">
            <Input type="search" name="q" defaultValue={searchText} isRequired />
            <IconButton aria-label="Search" variant="ghost" icon={<TbSearch />} type="submit" />
          </InputGroup>
        </Form>
      </Box>

      <ButtonGroup isAttached pr={2} alignItems="center">
        <IconButton
          aria-label={useColorModeValue("Switch to Dark Mode", "Switch to Light Mode")}
          title={useColorModeValue("Switch to Dark Mode", "Switch to Light Mode")}
          icon={useColorModeValue(<BiMoon />, <BiSun />)}
          variant="ghost"
          onClick={toggleColorMode}
        />

        <Box>
          <Menu>
            <MenuButton
              as={IconButton}
              aria-label="User Settings"
              title="User Settings"
              icon={
                user ? (
                  <Avatar size="xs" src={user.avatarUrl} title={user.username} />
                ) : (
                  <Avatar
                    size="xs"
                    bg="gray.500"
                    borderColor="gray.400"
                    _dark={{ bg: "gray.600", borderColor: "gray.500" }}
                    showBorder
                  />
                )
              }
              variant="ghost"
            />
            <MenuList>
              <MenuItem onClick={onPrefModalOpen}>Settings...</MenuItem>
              <MenuItem onClick={onSysPromptModalOpen}>Default System Prompt...</MenuItem>
              <MenuItem onClick={handleLoginLogout}>
                {user ? (
                  "Logout"
                ) : (
                  <>
                    <BsGithub /> <Text ml={2}>Sign in with GitHub</Text>
                  </>
                )}
              </MenuItem>
              <MenuDivider />
              <MenuItem
                as="a"
                href="https://github.com/tarasglek/chatcraft.org"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub Repository"
                title="GitHub Repository"
              >
                GitHub Repository
              </MenuItem>
            </MenuList>
          </Menu>
        </Box>
      </ButtonGroup>

      <PreferencesModal
        isOpen={isPrefModalOpen}
        onClose={onPrefModalClose}
        finalFocusRef={inputPromptRef}
      />
      <DefaultSystemPromptModal
        isOpen={isSysPromptModalOpen}
        onClose={onSysPromptModalClose}
        finalFocusRef={inputPromptRef}
      />
    </Flex>
  );
}

export default Header;
