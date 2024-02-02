import React from "react";
import { MenuItem as ReactMenuItem } from "@szhsin/react-menu";

export interface MenuItemProps {
  label: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

const MenuItem: React.FC<MenuItemProps> = ({ label, onClick, className }) => {
  return (
    <ReactMenuItem onClick={onClick} className={className}>
      {label}
    </ReactMenuItem>
  );
};

export default MenuItem;
