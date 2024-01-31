import React from "react";
import { MenuItem as ReactMenuItem } from "@szhsin/react-menu";

export interface MenuItemProps {
  label: React.ReactNode;
  onClick: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ label, onClick }) => {
  return <ReactMenuItem onClick={onClick}>{label}</ReactMenuItem>;
};

export default MenuItem;
