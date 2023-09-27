import {
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  IconButton,
} from "@chakra-ui/react";
import { Link as ReactRouterLink } from "react-router-dom";
import { TbPlus } from "react-icons/tb";

type NewButtonProps = {
  forkUrl?: string;
  variant?: "outline" | "solid" | "ghost";
  iconOnly?: boolean;
};

function NewButton({ forkUrl, variant = "outline", iconOnly = false }: NewButtonProps) {
  return (
    <Menu>
      {iconOnly ? (
        <MenuButton as={IconButton} size="lg" variant="outline" icon={<TbPlus />} isRound />
      ) : (
        <MenuButton as={Button} size="sm" variant={variant} rightIcon={<TbPlus />}>
          New
        </MenuButton>
      )}
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
