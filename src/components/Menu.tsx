import React from "react";
import { Menu, MenuButton, MenuItem, SubMenu } from "@szhsin/react-menu";
import "@szhsin/react-menu/dist/index.css";
import { Box } from "@chakra-ui/react";

export interface MenuItemProps {
  label: string;
  onClick?: () => void; // Add the onClick handler here
  subItems?: MenuItemProps[];
}

interface ChakraMenuProps {
  items: MenuItemProps[];
}

const ChakraMenu: React.FC<ChakraMenuProps> = ({ items }) => {
  const renderMenuItem = (item: MenuItemProps) => {
    if (item.subItems) {
      return (
        <SubMenu label={item.label} key={item.label}>
          {item.subItems.map((subItem) => renderMenuItem(subItem))}
        </SubMenu>
      );
    } else {
      return (
        <MenuItem key={item.label} onClick={item.onClick}>
          {item.label}
        </MenuItem>
      );
    }
  };

  return (
    <Box>
      <Menu
        menuButton={
          <MenuButton
            style={{
              borderRadius: "4px",
              backgroundColor: "#319795",
              color: "white",
              padding: "6px 24px",
              fontSize: "16px",
              fontWeight: "600",
            }}
          >
            Open Menu
          </MenuButton>
        }
      >
        {items.map((item) => renderMenuItem(item))}
      </Menu>
    </Box>
  );
};

export default ChakraMenu;
