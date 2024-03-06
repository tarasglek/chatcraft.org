import {
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  IconButton,
  Input,
  InputGroup,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { TbSearch } from "react-icons/tb";
import { Form } from "react-router-dom";
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
  const brandColor = useColorModeValue("blue.600", "blue.200");

  return (
    <Drawer
      autoFocus={false}
      isOpen={isSidebarVisible}
      onClose={handleToggleSidebarVisible}
      placement="left"
    >
      <DrawerOverlay />
      <DrawerContent>
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
          <Form action="/s" method="get" onSubmit={handleToggleSidebarVisible}>
            <InputGroup size="sm" variant="outline">
              <Input
                type="search"
                defaultValue={searchText}
                name="q"
                isRequired
                placeholder="Search chat history"
              />
              <IconButton aria-label="Search" variant="ghost" icon={<TbSearch />} type="submit" />
            </InputGroup>
          </Form>
          <DrawerCloseButton />
        </DrawerHeader>

        <DrawerBody m={0} p={0}>
          <SidebarContent selectedChat={selectedChat} selectedFunction={selectedFunction} />
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

export default SidebarMobile;
