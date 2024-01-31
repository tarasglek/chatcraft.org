import { Box, IconButton, useColorMode } from "@chakra-ui/react";
import { Menu as ReactMenu } from "@szhsin/react-menu";

import React from "react";
import { TbDots } from "react-icons/tb";

// Stylesheets
import "@szhsin/react-menu/dist/core.css";
import "@szhsin/react-menu/dist/index.css";
import "@szhsin/react-menu/dist/theme-dark.css";
import "@szhsin/react-menu/dist/transitions/slide.css";
import "./Menu.css";

interface MenuProps {
  children: React.ReactNode;
  isLoading?: boolean;
}

const Menu: React.FC<MenuProps> = ({ children, isLoading }) => {
  const { colorMode } = useColorMode();
  return (
    <Box>
      <ReactMenu
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
