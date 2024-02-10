import { Box } from "@chakra-ui/react";
import { SubMenu as ReactMenuSubMenu, type SubMenuProps } from "@szhsin/react-menu";
import React from "react";

const SubMenu: React.FC<SubMenuProps> = (props) => {
  return (
    <Box>
      <ReactMenuSubMenu {...props}>{props.children}</ReactMenuSubMenu>
    </Box>
  );
};

export default SubMenu;
