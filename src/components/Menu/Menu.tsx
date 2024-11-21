import { IconButton } from "@chakra-ui/react";
import { Menu as ReactMenu, type MenuProps as ReactMenuProps } from "@szhsin/react-menu";
import { useTheme } from "next-themes";
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
  menuButton?: ReactMenuProps["menuButton"];
};

const Menu: React.FC<MenuProps> = (props) => {
  //const { colorMode } = useColorMode();
  const { theme } = useTheme();
  const menuButton = props.menuButton ?? (
    <IconButton aria-label="Menu" variant="ghost" disabled={props.isDisabled}>
      <TbDots />
    </IconButton>
  );

  return (
    <ReactMenu
      transition={true}
      theming={theme === "dark" ? "dark" : undefined}
      {...props}
      menuButton={menuButton}
      menuStyle={{
        minWidth: "225px",
        ...props.menuStyle,
      }}
    >
      {props.children}
    </ReactMenu>
  );
};

export default Menu;
