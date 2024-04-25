import React from "react";
import { Link } from "@chakra-ui/react";
import { Link as ReactRouterLink } from "react-router-dom";

import MenuItem, { type MenuItemProps } from "./MenuItem";

export type MenuItemLinkProps = MenuItemProps & {
  to: string;
  target?: string;
};

const MenuItemLink: React.FC<MenuItemLinkProps> = ({ to, target, children, ...props }) => {
  return (
    <Link as={ReactRouterLink} to={to} target={target} _hover={{ textDecoration: "none" }}>
      <MenuItem {...props}>{children}</MenuItem>
    </Link>
  );
};

export default MenuItemLink;
