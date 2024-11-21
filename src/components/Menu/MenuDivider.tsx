import React from "react";
import { MenuDivider as ReactMenuDivider } from "@szhsin/react-menu";
import { Box } from "@chakra-ui/react";
import { useTheme } from "next-themes";

const MenuDivider: React.FC = () => {
  const { theme } = useTheme();
  const dividerColor = theme === "light" ? "gray.200" : "gray.600";

  return <Box as={ReactMenuDivider} borderColor={dividerColor} my={1} />;
};

export default MenuDivider;
