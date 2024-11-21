import { Flex, IconProps } from "@chakra-ui/react";
import { SubMenu as ReactMenuSubMenu, type SubMenuProps } from "@szhsin/react-menu";
import { useTheme } from "next-themes";
import React, { type ReactElement } from "react";

type ReactSubMenuProps = Omit<SubMenuProps, "label"> & {
  label: string;
  icon?: ReactElement<IconProps>;
  iconSpacing?: number;
};

const SubMenu: React.FC<ReactSubMenuProps> = ({ color, label, icon, iconSpacing, ...props }) => {
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
    <ReactMenuSubMenu
      itemProps={{ style: { color: toCssColor(color) } }}
      align="center"
      {...props}
      label={
        <Flex gap={iconSpacing ?? 2} alignItems={"center"}>
          {icon}
          {label}
        </Flex>
      }
    >
      {props.children}
    </ReactMenuSubMenu>
  );
};

export default SubMenu;
