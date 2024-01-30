import React from "react";
import { MenuDivider as ReactMenuDivider } from "@szhsin/react-menu";
import { Box, useColorModeValue } from "@chakra-ui/react";

const MenuDivider: React.FC = () => {
  const dividerColor = useColorModeValue("gray.200", "gray.600");

  return (
    <Box
      as={ReactMenuDivider}
      borderColor={dividerColor}
      my={1} // Adjust margin as needed
      // Add any additional styles you want to apply to the divider
    />
  );
};

export default MenuDivider;
