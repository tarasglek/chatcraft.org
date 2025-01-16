import { useCallback, type RefObject } from "react";
import {
  Avatar,
  Box,
  Flex,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
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
import { Form } from "react-router-dom";

import PreferencesModal from "./Preferences/PreferencesModal";
import { useUser } from "../hooks/use-user";
import useMobileBreakpoint from "../hooks/use-mobile-breakpoint";
import { ChatCraftChat } from "../lib/ChatCraftChat";
import { useAlert } from "../hooks/use-alert";
import { ChatCraftAppMessage } from "../lib/ChatCraftMessage";

type HeaderProps = {
  chatId?: string;
  inputPromptRef?: RefObject<HTMLTextAreaElement>;
  searchText?: string;
  onToggleSidebar: () => void;
};

function Header({ chatId, inputPromptRef, searchText, onToggleSidebar }: HeaderProps) {
  const { toggleColorMode } = useColorMode();
  const { error } = useAlert();
  const {
    isOpen: isPrefModalOpen,
    onOpen: onPrefModalOpen,
    onClose: onPrefModalClose,
  } = useDisclosure();
  const { user, login, logout } = useUser();

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

  const handleShowAnalytics = useCallback(
    async (chatId: string) => {
      const chat = await ChatCraftChat.find(chatId);
      if (!chat) {
        console.error("Couldn't find chat with given chatId");
        return error({
          title: "Error Displaying Analytics",
          message: "Unable to add Analytics message to chat: no chat found",
        });
      }

      chat.addMessage(new ChatCraftAppMessage({ text: "app:analytics" }));
    },
    [error]
  );

  const isMobile = useMobileBreakpoint();

  return (
    <Flex
      w="100%"
      h="3rem"
      gap={3}
      bg={useColorModeValue("white", "gray.700")}
      justify="space-between"
      align="center"
      borderBottom="2px"
      borderColor={useColorModeValue("gray.50", "gray.600")}
    >
      <Flex pl={1} align="center" gap={2}>
        <IconButton
          fontSize="1.5rem"
          icon={<BiMenu />}
          variant="ghost"
          aria-label="Toggle Sidebar Menu"
          title="Toggle Sidebar Menu"
          onClick={onToggleSidebar}
        />

        <Text
          fontWeight="bold"
          fontSize="1.125rem"
          color={useColorModeValue("blue.600", "blue.200")}
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
        {!isMobile && (
          <Form action="/s" method="get">
            <InputGroup size="sm" variant="outline">
              <Input
                fontSize="1rem"
                type="search"
                name="q"
                defaultValue={searchText}
                borderRadius={4}
                isRequired
                placeholder="Search chat history"
              />
              <InputRightElement>
                <IconButton
                  size="sm"
                  height="2rem"
                  aria-label="Search"
                  variant="ghost"
                  icon={<TbSearch />}
                  type="submit"
                />
              </InputRightElement>
            </InputGroup>
          </Form>
        )}
      </Box>

      <Flex pr={2} alignItems="center">
        <IconButton
          fontSize="1.25rem"
          aria-label={useColorModeValue("Switch to Dark Mode", "Switch to Light Mode")}
          title={useColorModeValue("Switch to Dark Mode", "Switch to Light Mode")}
          icon={useColorModeValue(<BiMoon />, <BiSun />)}
          variant="ghost"
          onClick={toggleColorMode}
        />

        <Box zIndex={2}>
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
              {!!chatId && (
                <MenuItem onClick={() => handleShowAnalytics(chatId)}>Analytics</MenuItem>
              )}
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
      </Flex>

      <PreferencesModal
        isOpen={isPrefModalOpen}
        onClose={onPrefModalClose}
        finalFocusRef={inputPromptRef}
      />
    </Flex>
  );
}

export default Header;
