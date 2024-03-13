import { SubMenu as ReactMenuSubMenu, type SubMenuProps } from "@szhsin/react-menu";
import React from "react";

const SubMenu: React.FC<SubMenuProps> = (props) => {
  return (
    <ReactMenuSubMenu align="center" {...props}>
      {props.children}
    </ReactMenuSubMenu>
  );
};

export default SubMenu;
