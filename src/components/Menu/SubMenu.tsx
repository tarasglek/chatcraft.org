import { Box } from "@chakra-ui/react";
import { SubMenu as ReactMenuSubMenu } from "@szhsin/react-menu";
import React from "react";

export interface SubMenuProps {
  label: string;
  children: React.ReactNode;
}

const SubMenu: React.FC<SubMenuProps> = ({ label, children }) => {
  return (
    <Box>
      <ReactMenuSubMenu label={label}>{children}</ReactMenuSubMenu>
    </Box>
  );
};

export default SubMenu;
