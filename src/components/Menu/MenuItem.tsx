import React, { type ReactNode } from "react";
import {
  MenuItem as ReactMenuItem,
  type MenuItemProps as ReactMenuItemProps,
} from "@szhsin/react-menu";

export type MenuItemProps = ReactMenuItemProps & { label: ReactNode; icon?: ReactNode };

const MenuItem: React.FC<MenuItemProps> = ({ label, icon, ...props }) => {
  return (
    <ReactMenuItem {...props}>
      <div style={{ display: "flex", alignItems: "center" }}>
        {icon && <span style={{ marginRight: "8px" }}>{icon}</span>}
        {label}
      </div>
    </ReactMenuItem>
  );
};

export default MenuItem;
