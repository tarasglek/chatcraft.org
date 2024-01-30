import React from "react";
import { MenuItem as ReactMenuMenuItem } from "@szhsin/react-menu";
import { useColorModeValue } from "@chakra-ui/react";

export interface MenuItemProps {
  label: React.ReactNode;
  onClick: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ label, onClick }) => {
  const menuItemBg = useColorModeValue("white", "gray.700");
  const menuItemColor = useColorModeValue("black", "white");

  return (
    <ReactMenuMenuItem
      onClick={onClick}
      style={{
        color: menuItemColor,
        backgroundColor: menuItemBg,
        // Add other styles as needed
      }}
    >
      {label}
    </ReactMenuMenuItem>
  );
};

export default MenuItem;
