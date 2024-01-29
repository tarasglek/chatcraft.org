import React from "react";
import { Menu, MenuButton, MenuItem, SubMenu } from "@szhsin/react-menu";
import "@szhsin/react-menu/dist/index.css";
import { Box, useColorModeValue, IconButton, useTheme } from "@chakra-ui/react";
import { TbDots } from "react-icons/tb";

export interface MenuItemProps {
  label: string;
  onClick?: () => void; // Add the onClick handler here
  subItems?: MenuItemProps[];
}

interface ChakraMenuProps {
  items: MenuItemProps[];
}

const ChakraMenu: React.FC<ChakraMenuProps> = ({ items }) => {
  const theme = useTheme();
  const menuButtonColor = useColorModeValue(theme.colors.black, theme.colors.white);
  const menuListBg = useColorModeValue(theme.colors.white, theme.colors.gray[700]);
  const menuListBorderColor = useColorModeValue(theme.colors.gray[200], theme.colors.gray[600]);
  const renderMenuItem = (item: MenuItemProps) => {
    const menuItemStyles = {
      color: menuButtonColor,
      backgroundColor: menuListBg,
      borderColor: menuListBorderColor,
    };
    if (item.subItems) {
      return (
        <SubMenu
          label={item.label}
          key={item.label}
          menuStyle={{ backgroundColor: menuListBg }}
          itemProps={{ style: menuItemStyles }}
        >
          {item.subItems.map((subItem) => renderMenuItem(subItem))}
        </SubMenu>
      );
    } else {
      return (
        <MenuItem key={item.label} onClick={item.onClick} style={menuItemStyles}>
          {item.label}
        </MenuItem>
      );
    }
  };

  return (
    <Box>
      <Menu
        menuButton={
          <MenuButton>
            <IconButton icon={<TbDots />} variant="ghost" size="sm" aria-label="Options" />
          </MenuButton>
        }
        menuStyle={{
          borderColor: menuListBorderColor,
          backgroundColor: menuListBg,
          color: menuButtonColor,
          boxShadow: theme.shadows.md,
        }}
      >
        {items.map((item) => renderMenuItem(item))}
      </Menu>
    </Box>
  );
};

export default ChakraMenu;
