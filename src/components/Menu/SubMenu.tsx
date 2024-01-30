import React from "react";
import { SubMenu as ReactMenuSubMenu } from "@szhsin/react-menu";
import { Box, useColorModeValue } from "@chakra-ui/react";

export interface SubMenuProps {
  label: string;
  children: React.ReactNode;
}

const SubMenu: React.FC<SubMenuProps> = ({ label, children }) => {
  const submenuBg = useColorModeValue("white", "gray.700");
  const submenuBorderColor = useColorModeValue("gray.200", "gray.600");

  return (
    <Box>
      <ReactMenuSubMenu
        label={label}
        menuStyle={{
          backgroundColor: submenuBg,
          borderColor: submenuBorderColor,
        }}
      >
        {children}
      </ReactMenuSubMenu>
    </Box>
  );
};

export default SubMenu;
