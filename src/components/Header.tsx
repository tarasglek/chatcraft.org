import { useCallback, type RefObject } from "react";
import {
  Box,
  Flex,
  IconButton,
  Input,
  Link,
  Button,
  Separator as Divider,
  Text,
  useDisclosure,
  HStack,
} from "@chakra-ui/react";
import { InputGroup } from "./ui/input-group";
import { MenuRoot, MenuItem, MenuContent } from "./ui/menu";
import { Avatar } from "./ui/avatar";
import { BiSun, BiMoon, BiMenu } from "react-icons/bi";
import { BsGithub } from "react-icons/bs";
import { FcGoogle } from "react-icons/fc";
import { TbSearch } from "react-icons/tb";
import { FiRss } from "react-icons/fi";
import { Form } from "react-router-dom";
import { useTheme } from "next-themes";
import { useUser } from "../hooks/use-user";
import { useAlert } from "../hooks/use-alert";
import PreferencesModal from "./Preferences/PreferencesModal";
import useMobileBreakpoint from "../hooks/use-mobile-breakpoint";

type HeaderProps = {
  chatId?: string;
  inputPromptRef?: RefObject<HTMLTextAreaElement>;
  searchText?: string;
  onToggleSidebar: () => void;
};

function Header({ chatId, inputPromptRef, searchText, onToggleSidebar }: HeaderProps) {
  //const { toggleColorMode } = useColorMode();
  const { theme, setTheme } = useTheme();
  const bgcolor = theme === "light" ? "white" : "gray.700";
  const borderColor = theme === "light" ? "gray.50" : "gray.600";
  const textColor = theme === "light" ? "blue.600" : "blue.200";
  const linkColor = theme === "light" ? "blue.400" : "blue.100";
  const {
    open: isPrefModalOpen,
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
      h="3rem"
      gap={3}
      bg={bgcolor}
      justify="space-between"
      align="center"
      borderBottom="2px"
      borderColor={borderColor}
    >
      <Flex pl={1} align="center" gap={2}>
        <IconButton
          fontSize="1.5rem"
          variant="ghost"
          aria-label="Toggle Sidebar Menu"
          title="Toggle Sidebar Menu"
          onClick={onToggleSidebar}
        >
          <BiMenu />
        </IconButton>

        <Text fontWeight="bold" fontSize="1.125rem" color={textColor}>
          <Link href="/" _hover={{ textDecoration: "none", color: linkColor }}>
            &lt;ChatCraft /&gt;
          </Link>
        </Text>
      </Flex>

      <Box flex={1} maxW="500px">
        {!isMobile && (
          <HStack gap="10" width="full">
            <Form action="/s" method="get">
              <InputGroup flex="1">
                <Input
                  fontSize="1rem"
                  type="search"
                  name="q"
                  defaultValue={searchText}
                  borderRadius={4}
                  required
                  placeholder="Search chat history"
                />
              </InputGroup>
              <InputGroup flex="1">
                <IconButton
                  size="sm"
                  height="2rem"
                  aria-label="Search"
                  variant="ghost"
                  type="submit"
                >
                  <TbSearch />
                </IconButton>
              </InputGroup>
            </Form>
          </HStack>
        )}
      </Box>

      <Flex pr={2} alignItems="center">
        <IconButton
          fontSize="1.25rem"
          aria-label={"Copy Shared Chats Feed URL"}
          title={"Copy Shared Chats Feed URL"}
          variant="ghost"
          onClick={handleOpenFeedUrl}
        >
          <FiRss />
        </IconButton>
        <IconButton
          fontSize="1.25rem"
          aria-label={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
          title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
          variant="ghost"
          onClick={theme === "light" ? () => setTheme("dark") : () => setTheme("light")}
        >
          {theme === "light" ? <BiMoon /> : <BiSun />}
        </IconButton>

        <Box zIndex={2}>
          <MenuRoot>
            <Button
              as={IconButton}
              aria-label="User Settings"
              title="User Settings"
              variant="ghost"
            >
              {user ? (
                <Avatar size="xs" src={user.avatarUrl} title={user.username} />
              ) : (
                <Avatar
                  size="xs"
                  bg="gray.500"
                  borderColor="gray.400"
                  _dark={{ bg: "gray.600", borderColor: "gray.500" }}
                  border={1}
                />
              )}
            </Button>
            <MenuContent>
              <MenuItem asChild value="Settings...">
                <Text onClick={onPrefModalOpen}>Settings...</Text>
              </MenuItem>
              {user ? (
                <MenuItem asChild value="logout">
                  <Text
                    onClick={() => {
                      handleLoginLogout("");
                    }}
                  >
                    Logout
                  </Text>
                </MenuItem>
              ) : (
                <>
                  <MenuItem asChild value="githubLogin">
                    <BsGithub />{" "}
                    <Text
                      ml={2}
                      onClick={() => {
                        handleLoginLogout("github");
                      }}
                    >
                      Sign in with GitHub
                    </Text>
                  </MenuItem>
                  <MenuItem asChild value="googleLogin">
                    <FcGoogle />{" "}
                    <Text
                      ml={2}
                      onClick={() => {
                        handleLoginLogout("google");
                      }}
                    >
                      Sign in with Google
                    </Text>
                  </MenuItem>
                </>
              )}
              <Divider />
              <MenuItem asChild value="GitHub Repository">
                <Text>
                  <Link
                    as="a"
                    href="https://github.com/tarasglek/chatcraft.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="GitHub Repository"
                    title="GitHub Repository"
                  >
                    GitHub Repository
                  </Link>
                </Text>
              </MenuItem>
            </MenuContent>
          </MenuRoot>
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
