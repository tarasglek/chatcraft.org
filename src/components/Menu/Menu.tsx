import React from "react";
import { Menu as ReactMenu } from "@szhsin/react-menu"; // Alias for the imported Menu
import "@szhsin/react-menu/dist/index.css";
import "@szhsin/react-menu/dist/theme-dark.css";
import "@szhsin/react-menu/dist/transitions/slide.css";
import "@szhsin/react-menu/dist/core.css";
import { Box, IconButton, useColorMode } from "@chakra-ui/react";
import { TbDots } from "react-icons/tb";

interface MenuProps {
  children: React.ReactNode;
  isLoading?: boolean;
}

const Menu: React.FC<MenuProps> = ({ children, isLoading }) => {
  const { colorMode } = useColorMode();
  return (
    <Box>
      <ReactMenu // Use the alias here
        theming={colorMode === "dark" ? "dark" : undefined}
        menuButton={
          <IconButton
            aria-label="Message Menu"
            icon={<TbDots />}
            variant="ghost"
            isDisabled={isLoading}
          ></IconButton>
        }
        transition={true}
      >
        {children}
      </ReactMenu>
    </Box>
  );
};

export default Menu;
