import { useCallback, type RefObject } from "react";
import {
  Avatar,
  Box,
  ButtonGroup,
  Flex,
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
import { BiSun, BiMoon, BiMenu } from "react-icons/bi";
import { BsGithub } from "react-icons/bs";
import { FcGoogle } from "react-icons/fc";
import { TbSearch } from "react-icons/tb";
import { FiRss } from "react-icons/fi";
import { Form } from "react-router-dom";

import PreferencesModal from "./Preferences/PreferencesModal";
import { useUser } from "../hooks/use-user";
import useMobileBreakpoint from "../hooks/use-mobile-breakpoint";
import { useAlert } from "../hooks/use-alert";

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
  const { user, login, logout } = useUser();
  const { error } = useAlert();

  const handleLoginLogout = useCallback(
    (provider: string) => {
      if (user) {
        logout(chatId);
      } else {
        login(provider, chatId);
      }
    },
    [chatId, user, login, logout]
  );

  const isMobile = useMobileBreakpoint();

  const handleOpenFeedUrl = useCallback(async () => {
    if (!user) {
      error({
        title: "Failed to Open Feed",
        message: "Can't open feed because user is not logged in",
      });
      return;
    }
    try {
      const currentUrl = window.location.href;
      const parsedUrl = new URL(currentUrl);
      const userFeedUrl = `${parsedUrl.origin}/api/share/${user.username}/feed.atom`;
      window.open(userFeedUrl, "_blank");
    } catch (err) {
      console.error(err);
      error({
        title: "Failed to Open Shared Chats Feed URL",
        message: "An error occurred while trying to open shared chats feed URL.",
      });
    }
  }, [user, error]);

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
        <IconButton
          icon={<BiMenu />}
          variant="ghost"
          aria-label="Toggle Sidebar Menu"
          title="Toggle Sidebar Menu"
          onClick={onToggleSidebar}
        />

        <Text fontWeight="bold" color={useColorModeValue("blue.600", "blue.200")}>
          <Link
            href="/"
            _hover={{ textDecoration: "none", color: useColorModeValue("blue.400", "blue.100") }}
          >
            &lt;ChatCraft /&gt;
          </Link>
        </Text>
      </Flex>

      <Box flex={1} maxW="500px">
        {!isMobile && (
          <Form action="/s" method="get">
            <InputGroup size="sm" variant="outline">
              <Input
                type="search"
                name="q"
                defaultValue={searchText}
                isRequired
                placeholder="Search chat history"
              />
              <IconButton aria-label="Search" variant="ghost" icon={<TbSearch />} type="submit" />
            </InputGroup>
          </Form>
        )}
      </Box>

      <ButtonGroup isAttached pr={2} alignItems="center">
        <IconButton
          aria-label={"Copy Shared Chats Feed URL"}
          title={"Copy Shared Chats Feed URL"}
          icon={<FiRss />}
          variant="ghost"
          onClick={handleOpenFeedUrl}
        />
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
              {user ? (
                <MenuItem
                  onClick={() => {
                    handleLoginLogout("");
                  }}
                >
                  Logout
                </MenuItem>
              ) : (
                <>
                  <MenuItem
                    onClick={() => {
                      handleLoginLogout("github");
                    }}
                  >
                    <BsGithub /> <Text ml={2}>Sign in with GitHub</Text>
                  </MenuItem>
                  {/* Google login */}
                  <MenuItem
                    onClick={() => {
                      handleLoginLogout("google");
                    }}
                  >
                    <FcGoogle /> <Text ml={2}>Sign in with Google</Text>
                  </MenuItem>
                </>
              )}

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
    </Flex>
  );
}

export default Header;
