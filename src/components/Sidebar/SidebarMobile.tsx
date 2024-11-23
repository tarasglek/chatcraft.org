import { HStack, Input, Text } from "@chakra-ui/react";
import { TbSearch } from "react-icons/tb";
import {
  DrawerBackdrop,
  DrawerBody,
  DrawerCloseTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerRoot,
  DrawerTrigger,
} from "../ui/drawer";
import { InputGroup } from "../ui/input-group";
import { Form } from "react-router-dom";
import { useTheme } from "next-themes";
import SidebarContent, { SidebarContentProps } from "./SidebarContent";

type SidebarMobileProps = SidebarContentProps & {
  searchText?: string;
  handleToggleSidebarVisible: () => void;
  isSidebarVisible: boolean;
};

function SidebarMobile({
  searchText,
  handleToggleSidebarVisible,
  isSidebarVisible,
  selectedChat,
  selectedFunction,
}: SidebarMobileProps) {
  const { theme } = useTheme();
  const brandColor = theme === "light" ? "#2B6CB0" : "#90CEF4";

  return (
    <DrawerRoot open={isSidebarVisible} placement={"start"}>
      <DrawerBackdrop />
      <DrawerContent>
        <DrawerTrigger asChild>
          <DrawerHeader mt={2} p={2}>
            <Text
              position={"relative"}
              top={-1}
              ml={2}
              mb={2}
              fontSize="lg"
              fontWeight="bold"
              color={brandColor}
            >
              &lt;ChatCraft /&gt;
            </Text>
          </DrawerHeader>
        </DrawerTrigger>

        <Form action="/s" method="get" onSubmit={handleToggleSidebarVisible}>
          <HStack w="100%" gap={2} px={2}>
            <InputGroup flex={1} endElement={<TbSearch color={brandColor} />}>
              <Input
                fontSize="1rem"
                type="search"
                defaultValue={searchText}
                name="q"
                borderRadius={4}
                required
                placeholder="Search chat history"
                css={{
                  focusRingColor: brandColor,
                }}
              />
            </InputGroup>
          </HStack>
        </Form>
        <DrawerCloseTrigger onClick={handleToggleSidebarVisible} />
        <DrawerBody m={0} p={0}>
          <SidebarContent selectedChat={selectedChat} selectedFunction={selectedFunction} />
        </DrawerBody>
      </DrawerContent>
    </DrawerRoot>
  );
}

export default SidebarMobile;
