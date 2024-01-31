import React from "react";
import { Menu as ReactMenu } from "@szhsin/react-menu"; // Alias for the imported Menu
import "@szhsin/react-menu/dist/index.css";
import { Box, IconButton, useColorModeValue, useTheme } from "@chakra-ui/react";
import { TbDots } from "react-icons/tb";

interface MenuProps {
  children: React.ReactNode;
}

const Menu: React.FC<MenuProps> = ({ children }) => {
  const theme = useTheme();
  const menuButtonColor = useColorModeValue(theme.colors.black, theme.colors.white);
  const menuListBg = useColorModeValue(theme.colors.white, theme.colors.gray[700]);
  const menuListBorderColor = useColorModeValue(theme.colors.gray[200], theme.colors.gray[600]);

  return (
    <Box>
      <ReactMenu // Use the alias here
        menuButton={
          <IconButton
            aria-label="Message Menu"
            icon={<TbDots />}
            variant="ghost"
            isDisabled={isLoading}
          ></IconButton>
        }
        menuStyle={{
          borderColor: menuListBorderColor,
          backgroundColor: menuListBg,
          color: menuButtonColor,
          boxShadow: theme.shadows.md,
        }}
      >
        {children}
      </ReactMenu>
    </Box>
  );
};

export default Menu;
