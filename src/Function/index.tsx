import { useCallback, useMemo, useRef } from "react";
import {
  Box,
  Flex,
  useDisclosure,
  Grid,
  GridItem,
  Heading,
  Card,
  CardBody,
  Text,
  Menu,
  MenuButton,
  IconButton,
  MenuList,
  MenuItem,
  MenuDivider,
  CardFooter,
} from "@chakra-ui/react";
import { LuFunctionSquare } from "react-icons/lu";
import { useFetcher, useLoaderData } from "react-router-dom";
import { useCopyToClipboard } from "react-use";
import debounce from "lodash-es/debounce";

import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { useSettings } from "../hooks/use-settings";
import { ChatCraftFunction } from "../lib/ChatCraftFunction";
import FunctionEditor from "./FunctionEditor";
import { TbDots } from "react-icons/tb";
import { download, formatDate } from "../lib/utils";
import { useLiveQuery } from "dexie-react-hooks";
import { useAlert } from "../hooks/use-alert";

export default function Function() {
  const [, copyToClipboard] = useCopyToClipboard();
  const { info } = useAlert();
  const fetcher = useFetcher();

  const funcId = useLoaderData() as string;
  const { settings, setSettings } = useSettings();
  const { isOpen: isSidebarVisible, onToggle: toggleSidebarVisible } = useDisclosure({
    defaultIsOpen: settings.sidebarVisible,
  });
  const inputPromptRef = useRef<HTMLTextAreaElement>(null);

  const func = useLiveQuery<ChatCraftFunction | undefined>(() => {
    if (funcId) {
      return Promise.resolve(ChatCraftFunction.find(funcId));
    }
  }, [funcId]);

  const title = useMemo(() => {
    if (!func) {
      return "";
    }
    return `${func?.name}() - ${func.description}`;
  }, [func]);

  const filename = useMemo(() => {
    if (!func) {
      return "code.js";
    }
    return `${func.name}.js`;
  }, [func]);

  // Update the function's code in the db, but not on every keystroke
  const handleSave = debounce((value: string) => {
    if (!func) {
      return;
    }

    func.code = value;
    func.save().catch(console.warn);
  }, 250);

  const handleToggleSidebarVisible = useCallback(() => {
    const newValue = !isSidebarVisible;
    toggleSidebarVisible();
    setSettings({ ...settings, sidebarVisible: newValue });
  }, [isSidebarVisible, settings, setSettings, toggleSidebarVisible]);

  if (!func) {
    return null;
  }

  const handleCopyFunctionClick = () => {
    const text = func.code;
    copyToClipboard(text);
    info({
      title: "Function copied to clipboard",
    });
  };

  const handleDownloadFunctionClick = () => {
    const text = func.code;
    download(text, filename, "text/javascript");
    info({
      title: "Function downloaded",
    });
  };

  const handleDeleteFunctionClick = () => {
    fetcher.submit({}, { method: "post", action: `/f/${func.id}/delete` });
  };

  return (
    <Grid
      w="100%"
      h="100%"
      gridTemplateRows="min-content 1fr min-content"
      gridTemplateColumns={{
        base: isSidebarVisible ? "300px 1fr" : "0 1fr",
        sm: isSidebarVisible ? "300px 1fr" : "0 1fr",
        md: isSidebarVisible ? "minmax(300px, 1fr) 4fr" : "0: 1fr",
      }}
      bgGradient="linear(to-b, white, gray.100)"
      _dark={{ bgGradient: "linear(to-b, gray.600, gray.700)" }}
    >
      <GridItem colSpan={2}>
        <Header inputPromptRef={inputPromptRef} onToggleSidebar={handleToggleSidebarVisible} />
      </GridItem>

      <GridItem rowSpan={3} overflowY="auto">
        <Sidebar selectedFunction={func} />
      </GridItem>

      <GridItem overflowY="auto" pos="relative">
        <Flex
          direction="column"
          h="100%"
          maxH="100%"
          maxW={settings.useFullWidth ? "100%" : "900px"}
          mx="auto"
          px={1}
          gap={4}
        >
          <>
            <Card
              variant="filled"
              bg="gray.200"
              size="sm"
              border="1px solid"
              borderColor="gray.300"
              _dark={{
                bg: "gray.800",
                borderColor: "gray.900",
              }}
              mt={2}
            >
              <CardBody pb={0}>
                <Heading as="h2" fontSize="lg">
                  <Flex align="center" justifyContent="space-between">
                    <Flex align="center" gap={2}>
                      <LuFunctionSquare />
                      <Text fontSize="md" fontWeight="bold" noOfLines={1}>
                        {title}
                      </Text>
                    </Flex>

                    <Menu>
                      <MenuButton
                        as={IconButton}
                        aria-label="Chat Menu"
                        icon={<TbDots />}
                        variant="ghost"
                      />
                      <MenuList>
                        <MenuItem onClick={() => handleCopyFunctionClick()}>Copy</MenuItem>
                        <MenuItem onClick={() => handleDownloadFunctionClick()}>Download</MenuItem>

                        <MenuDivider />
                        <MenuItem color="red.400" onClick={() => handleDeleteFunctionClick()}>
                          Delete
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  </Flex>
                </Heading>
              </CardBody>
              <CardFooter pt={0} color="gray.500" _dark={{ color: "gray.400" }}>
                <Text fontSize="sm" ml={6}>
                  {formatDate(new Date())}
                </Text>
              </CardFooter>
            </Card>

            <Box flex={1} mb={4}>
              <Card>
                <CardBody>
                  <FunctionEditor
                    initialValue={func.code}
                    onChange={handleSave}
                    filename={filename}
                  />
                </CardBody>
              </Card>
            </Box>
          </>
        </Flex>
      </GridItem>
    </Grid>
  );
}
