import { Button, Menu, MenuButton, MenuList, MenuItem, MenuDivider } from "@chakra-ui/react";
import { Link as ReactRouterLink } from "react-router-dom";
import { TbPlus } from "react-icons/tb";

type NewButtonProps = {
  forkUrl?: string;
  variant?: "outline" | "solid" | "ghost";
};

function NewButton({ forkUrl, variant = "outline" }: NewButtonProps) {
  return (
    <Menu>
      <MenuButton as={Button} size="sm" variant={variant} rightIcon={<TbPlus />}>
        New
      </MenuButton>
      <MenuList>
        <MenuItem as={ReactRouterLink} to="/new">
          Clear Chat
        </MenuItem>
        <MenuDivider />
        <MenuItem as={ReactRouterLink} to="/new" target="_blank">
          New Blank Chat...
        </MenuItem>
        {forkUrl && (
          <MenuItem as={ReactRouterLink} to={forkUrl} target="_blank">
            New Duplicate Chat...
          </MenuItem>
        )}
      </MenuList>
    </Menu>
  );
}

export default NewButton;
