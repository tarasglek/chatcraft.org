import React, { type ReactNode } from "react";
import {
  MenuItem as ReactMenuItem,
  type MenuItemProps as ReactMenuItemProps,
} from "@szhsin/react-menu";

export type MenuItemProps = ReactMenuItemProps & { label: ReactNode; icon?: ReactNode };

const MenuItem: React.FC<MenuItemProps> = (props) => {
  return (
    <ReactMenuItem {...props}>
      {props.label}
      {props.icon}
    </ReactMenuItem>
  );
};

export default MenuItem;