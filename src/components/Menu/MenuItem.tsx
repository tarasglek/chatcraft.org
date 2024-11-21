import React, { ReactNode } from "react";
import {
  MenuItem as ReactMenuItem,
  type MenuItemProps as ReactMenuItemProps,
} from "@szhsin/react-menu";
import { Box } from "@chakra-ui/react";
import { useTheme } from "next-themes";

export type MenuItemProps = Omit<ReactMenuItemProps, "disabled"> & {
  icon?: ReactNode;
  iconSpacing?: number;
  isDisabled?: boolean;
};

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  iconSpacing = 2,
  isDisabled,
  children,
  ...props
}) => {
  const { theme } = useTheme();

  const toCssColor = (colorValue?: string) => {
    if (!colorValue) {
      return undefined;
    }

    // Check for ChakraUI colors vs normal CSS (e.g., "red.400")
    if (!/\w+\.\d+/.test(colorValue)) {
      return colorValue;
    }

    const [color, shade] = colorValue.split(".");
    return theme === "light" ? `${color}.${shade}` : `${color}.${parseInt(shade) + 200}`;
  };

  return (
    <ReactMenuItem {...props} disabled={!!isDisabled} style={{ color: toCssColor(props.color) }}>
      <Box>
        {icon && (
          <Box marginRight={iconSpacing} as={"span"} color={props.color}>
            {icon}
          </Box>
        )}
        {children}
      </Box>
    </ReactMenuItem>
  );
};

export default MenuItem;
