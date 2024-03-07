import { Box, IconButton, useColorMode } from "@chakra-ui/react";
import { Menu as ReactMenu, type MenuProps as ReactMenuProps } from "@szhsin/react-menu";

import React from "react";
import { TbDots } from "react-icons/tb";

// Stylesheets
import "@szhsin/react-menu/dist/core.css";
import "@szhsin/react-menu/dist/index.css";
import "@szhsin/react-menu/dist/theme-dark.css";
import "@szhsin/react-menu/dist/transitions/slide.css";
import "./Menu.css";

export type MenuProps = Omit<ReactMenuProps, "menuButton" | "theming" | "transition"> & {
  isDisabled?: boolean;
};

const Menu: React.FC<MenuProps> = (props) => {
  const { colorMode } = useColorMode();
  return (
    <Box>
      <ReactMenu
        align={"end"}
        theming={colorMode === "dark" ? "dark" : undefined}
        menuButton={
          <IconButton
            aria-label="Message Menu"
            icon={<TbDots />}
            variant="ghost"
            isDisabled={props.isDisabled}
          />
        }
        transition={true}
      >
        {props.children}
      </ReactMenu>
    </Box>
  );
};

export default Menu;
