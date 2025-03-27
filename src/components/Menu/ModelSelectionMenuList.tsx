import { useState } from "react";
import { useDebounce } from "react-use";
import { MenuItem, MenuDivider } from "../Menu";
import { MenuGroup, MenuHeader } from "@szhsin/react-menu";
import { useSettings } from "../../hooks/use-settings";
import { useModels } from "../../hooks/use-models";
import { IoMdCheckmark } from "react-icons/io";
import { TbSearch } from "react-icons/tb";
import { Input, InputGroup, InputLeftElement } from "@chakra-ui/react";
import { isChatModel } from "../../lib/ai";
import useMobileBreakpoint from "../../hooks/use-mobile-breakpoint";
import { useTextToSpeech } from "../../hooks/use-text-to-speech";
import { MdVolumeOff, MdVolumeUp } from "react-icons/md";
import useAudioPlayer from "../../hooks/use-audio-player";
import { useProviders } from "../../hooks/use-providers";

interface ModelSelectionMenuListProps {
  onItemSelect: (modelId: string) => void;
}
function MobileModelSelectionMenuList({ onItemSelect }: ModelSelectionMenuListProps) {
  const { settings, setSettings } = useSettings();
  const { models } = useModels();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const { isTextToSpeechSupported } = useTextToSpeech();
  const { clearAudioQueue } = useAudioPlayer();
  const { providers } = useProviders();

  useDebounce(() => setDebouncedSearchQuery(searchQuery), 250, [searchQuery]);
  return (
    <>
      {/* Providers Section */}
      <MenuHeader>Providers</MenuHeader>
      <MenuGroup title="AI Providers">
        {Object.entries(providers).map(([providerName, providerObject]) => (
          <MenuItem
            style={{
              paddingInline: "16px",
            }}
            key={providerName}
            onClick={(e) => {
              e.stopPropagation = true;
              e.keepOpen = true;
              setSettings({ ...settings, currentProvider: providerObject });
            }}
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

      {/* Models Section */}
      <MenuHeader>Models</MenuHeader>
      <MenuGroup title="Models">
        <div style={{ maxHeight: "40dvh", overflowY: "auto" }}>
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
                }}
                style={{
                  paddingInline: "16px",
                }}
              >
                {settings.model.id === model.id ? (
                  <IoMdCheckmark style={{ marginRight: "0.6rem" }} />
                ) : (
                  <span style={{ paddingLeft: "1.6rem", display: "inline-block" }} />
                )}
                {model.name}
              </MenuItem>
            ))}
        </div>
        <div
          style={{
            paddingLeft: "0.75rem", // Add spacing for the icon
          }}
        >
          <InputGroup marginTop={2}>
            <InputLeftElement paddingLeft={3} pointerEvents="none">
              <TbSearch />
            </InputLeftElement>
            <Input
              marginInline={2}
              marginBottom={1}
              type="text"
              variant="outline"
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => {
                e.preventDefault();
                setSearchQuery(e.target.value);
              }}
            />
          </InputGroup>
        </div>
      </MenuGroup>

      {/* Text-to-Speech Section */}
      {isTextToSpeechSupported && (
        <>
          <MenuDivider />
          <MenuItem
            icon={
              settings.textToSpeech.announceMessages ? (
                <MdVolumeUp style={{ fontSize: "1.25rem" }} />
              ) : (
                <MdVolumeOff style={{ fontSize: "1.25rem" }} />
              )
            }
            onClick={() => {
              if (settings.textToSpeech.announceMessages) {
                // Flush any remaining audio clips being announced
                clearAudioQueue();
              }
              setSettings({
                ...settings,
                textToSpeech: {
                  ...settings.textToSpeech,
                  announceMessages: !settings.textToSpeech.announceMessages,
                },
              });
            }}
          >
            {settings.textToSpeech.announceMessages
              ? "Text-to-Speech Enabled"
              : "Text-to-Speech Disabled"}
          </MenuItem>
        </>
      )}
    </>
  );
}

function DesktopModelSelectionMenuList({ onItemSelect }: ModelSelectionMenuListProps) {
  const { settings, setSettings } = useSettings();
  const { models } = useModels();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const { providers } = useProviders();

  useDebounce(() => setDebouncedSearchQuery(searchQuery), 250, [searchQuery]);

  return (
    <>
      <MenuHeader
        style={{
          textTransform: "none", // default from MenuHeader is all caps
          fontWeight: "bold", // default from MenuHeader is normal text
          fontSize: "0.9rem",
        }}
      >
        Providers
      </MenuHeader>
      <MenuGroup title="AI Providers">
        {Object.entries(providers).map(([providerName, providerObject]) => (
          <MenuItem
            style={{
              paddingInline: "16px",
            }}
            key={providerName}
            onClick={(e) => {
              e.stopPropagation = true;
              e.keepOpen = true;
              setSettings({ ...settings, currentProvider: providerObject });
            }}
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
      <MenuHeader
        style={{
          textTransform: "none", // default from MenuHeader is all caps
          fontWeight: "bold", // default from MenuHeader is normal text
          fontSize: "0.90rem",
        }}
      >
        Models
      </MenuHeader>
      <MenuGroup title="Models">
        <InputGroup>
          <InputLeftElement paddingLeft={3} pointerEvents="none">
            <TbSearch />
          </InputLeftElement>
          <Input
            marginInline={2}
            marginBottom={1}
            type="text"
            variant="outline"
            placeholder="Search models..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </InputGroup>
        <div style={{ height: "40dvh", width: "60dvh", maxWidth: "27.5rem", overflowY: "auto" }}>
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
        </div>
      </MenuGroup>
    </>
  );
}

export default function ModelSelectionMenuList(props: ModelSelectionMenuListProps) {
  const isMobile = useMobileBreakpoint();

  return isMobile ? (
    <MobileModelSelectionMenuList {...props} />
  ) : (
    <DesktopModelSelectionMenuList {...props} />
  );
}
