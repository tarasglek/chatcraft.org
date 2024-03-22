import React, { ReactNode } from "react";
import {
  MenuItem as ReactMenuItem,
  type MenuItemProps as ReactMenuItemProps,
} from "@szhsin/react-menu";
import { Box } from "@chakra-ui/react";

export type MenuItemProps = ReactMenuItemProps & { icon?: ReactNode; iconSpacing?: number };

const MenuItem: React.FC<MenuItemProps> = ({ icon, iconSpacing = 2, children, ...props }) => {
  return (
    <ReactMenuItem {...props}>
      <>
        {icon && (
          <Box marginRight={iconSpacing} as={"span"}>
            {icon}
          </Box>
        )}
        {children}
      </>
    </ReactMenuItem>
  );
};

export default MenuItem;
