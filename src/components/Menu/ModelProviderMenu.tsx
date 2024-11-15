import {
  Box,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuDivider,
  MenuGroup,
  MenuItem,
  MenuList,
  IconButton,
  useDisclosure,
} from "@chakra-ui/react";
import { TbChevronUp, TbSearch } from "react-icons/tb";
import { IoMdCheckmark } from "react-icons/io";
import { useState, useMemo, useRef, type KeyboardEvent, ReactNode } from "react";
import { useDebounce } from "react-use";
import { FreeModelProvider } from "../../lib/providers/DefaultProvider/FreeModelProvider";
import theme from "../../theme";
import { isChatModel } from "../../lib/ai";
import { useSettings } from "../../hooks/use-settings";
import { useModels } from "../../hooks/use-models";
import SubMenu from "./SubMenu";
import React from "react";
import useMobileBreakpoint from "../../hooks/use-mobile-breakpoint";

interface ModelProviderMenuProps {
  label?: string;
  onItemSelect: (modelId: string) => void;
  openOnHover?: boolean;
  menuButtonLabel?: ReactNode;
}

const ModelProviderMenu: React.FC<ModelProviderMenuProps> = ({
  label,
  onItemSelect,
  openOnHover = false,
  menuButtonLabel = <TbChevronUp />,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const { settings, setSettings } = useSettings();
  const { models } = useModels();
  const inputRef = useRef<HTMLInputElement>(null);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const isMobile = useMobileBreakpoint();
  const adjustedOpenOnHover = isMobile ? false : openOnHover;

  const providersList = useMemo(
    () => ({
      ...settings.providers,
      "Free AI Models": new FreeModelProvider(),
    }),
    [settings.providers]
  );

  useDebounce(() => setDebouncedSearchQuery(searchQuery), 250, [searchQuery]);

  const onStartTyping = (e: KeyboardEvent<HTMLElement>) => {
    if (inputRef.current && document.activeElement !== inputRef.current) {
      if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Enter") return;
      e.preventDefault();
      setSearchQuery(searchQuery + (e.key.length === 1 ? e.key : ""));
      inputRef.current.focus();
    }
  };

  return (
    <Menu placement="auto" strategy="fixed" closeOnSelect={false} isOpen={isOpen} onClose={onClose}>
      {menuButtonLabel &&
      React.isValidElement(menuButtonLabel) &&
      menuButtonLabel.type === SubMenu ? (
        <MenuButton
          as={Box}
          fontSize="1rem"
          fontWeight="normal"
          cursor="pointer"
          color="inherit"
          padding="0"
          background="none"
          border="none"
          aria-label={label || "Choose Model"}
          title={label || "Choose Model"}
          onClick={adjustedOpenOnHover ? undefined : onOpen} // Open on click if not openOnHover
          onMouseEnter={adjustedOpenOnHover ? onOpen : undefined} // Open on hover if openOnHover
          onMouseLeave={adjustedOpenOnHover ? onClose : undefined} // Close on hover out if openOnHover
        >
          {menuButtonLabel}
        </MenuButton>
      ) : (
        <MenuButton
          as={IconButton}
          size="sm"
          fontSize="1.25rem"
          aria-label={label || "Choose Model"}
          title={label || "Choose Model"}
          icon={<TbChevronUp />}
          onClick={openOnHover ? undefined : onOpen} // Open on click if not openOnHover
          onMouseEnter={openOnHover ? onOpen : undefined} // Open on hover if openOnHover
          onMouseLeave={openOnHover ? onClose : undefined} // Close on hover out if openOnHover
          borderLeftRadius="0"
        />
      )}
      <MenuList
        maxHeight={isMobile ? "50vh" : "80vh"}
        overflowY="auto"
        zIndex={theme.zIndices.dropdown}
        onKeyDownCapture={onStartTyping}
        onMouseEnter={adjustedOpenOnHover ? onOpen : undefined}
        onMouseLeave={adjustedOpenOnHover ? onClose : undefined}
        sx={{
          maxWidth: "90vw",
          margin: "0 auto",
          left: isMobile ? "5%" : undefined,
          right: isMobile ? "5%" : undefined,
        }}
      >
        {/* Providers Section */}
        <MenuGroup title="Providers">
          {Object.entries(providersList).map(([providerName, providerObject]) => (
            <MenuItem
              key={providerName}
              paddingInline={4}
              onClick={() => setSettings({ ...settings, currentProvider: providerObject })}
            >
              {settings.currentProvider.name === providerName ? (
                <IoMdCheckmark style={{ marginRight: "0.6rem" }} />
              ) : (
                <span style={{ width: "1.6rem", display: "inline-block" }} />
              )}
              {providerName}
            </MenuItem>
          ))}
        </MenuGroup>
        <MenuDivider />

        {/* Models Section */}
        <MenuGroup title="Models">
          <InputGroup>
            <InputLeftElement paddingLeft={3} pointerEvents="none">
              <TbSearch />
            </InputLeftElement>
            <Input
              marginInline={2}
              marginBottom={1}
              ref={inputRef}
              type="text"
              variant="outline"
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </InputGroup>
          <Box maxHeight="40vh" overflowY="auto">
            {models
              .filter((model) => isChatModel(model.id))
              .filter((model) =>
                model.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
              )
              .map((model) => (
                <MenuItem
                  key={model.id}
                  onClick={() => {
                    onItemSelect(model.id);
                    onClose();
                  }}
                >
                  {settings.model.id === model.id ? (
                    <IoMdCheckmark style={{ marginRight: "0.6rem" }} />
                  ) : (
                    <span style={{ width: "1.6rem", display: "inline-block" }} />
                  )}
                  {model.name}
                </MenuItem>
              ))}
          </Box>
        </MenuGroup>
      </MenuList>
    </Menu>
  );
};

export default ModelProviderMenu;
