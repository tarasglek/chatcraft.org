import { Box } from "@chakra-ui/react";
import { SubMenu as ReactMenuSubMenu } from "@szhsin/react-menu";
import React from "react";

export interface SubMenuProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

const SubMenu: React.FC<SubMenuProps> = ({ label, children, className }) => {
  return (
    <Box>
      <ReactMenuSubMenu label={label} className={className}>
        {children}
      </ReactMenuSubMenu>
    </Box>
  );
};

export default SubMenu;
