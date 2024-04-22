import { Box, IconButton, useColorMode } from "@chakra-ui/react";
import { Menu as ReactMenu, type MenuProps as ReactMenuProps } from "@szhsin/react-menu";
import React from "react";
import { TbDots } from "react-icons/tb";

import theme from "../../theme";

// Stylesheets
import "@szhsin/react-menu/dist/core.css";
import "@szhsin/react-menu/dist/index.css";
import "@szhsin/react-menu/dist/theme-dark.css";
import "@szhsin/react-menu/dist/transitions/slide.css";
import "./Menu.css";

export type MenuProps = Omit<ReactMenuProps, "menuButton" | "theming" | "transition"> & {
  isDisabled?: boolean;
  menuButton?: ReactMenuProps["menuButton"];
};

const Menu: React.FC<MenuProps> = (props) => {
  const { colorMode } = useColorMode();
  const menuButton = props.menuButton ?? (
    <IconButton aria-label="Menu" icon={<TbDots />} variant="ghost" isDisabled={props.isDisabled} />
  );

  return (
    <Box zIndex={theme.zIndices.dropdown}>
      <ReactMenu
        {...props}
        align={"end"}
        theming={colorMode === "dark" ? "dark" : undefined}
        menuButton={menuButton}
        transition={true}
      >
        {props.children}
      </ReactMenu>
    </Box>
  );
};

export default Menu;
