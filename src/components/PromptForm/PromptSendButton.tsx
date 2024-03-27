import {
  Button,
  ButtonGroup,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Tooltip,
  MenuDivider,
  MenuGroup,
} from "@chakra-ui/react";
import { TbChevronUp, TbSend } from "react-icons/tb";
import { FREEMODELPROVIDER_API_URL } from "../../lib/ChatCraftProvider";
import { FreeModelProvider } from "../../lib/providers/DefaultProvider/FreeModelProvider";

import useMobileBreakpoint from "../../hooks/use-mobile-breakpoint";
import { useSettings } from "../../hooks/use-settings";
import { useModels } from "../../hooks/use-models";
import theme from "../../theme";
import { MdVolumeUp, MdVolumeOff } from "react-icons/md";
import { useMemo } from "react";
import useAudioPlayer from "../../hooks/use-audio-player";
import { providerFromJSON, usingOfficialOpenAI } from "../../lib/providers";

type PromptSendButtonProps = {
  isLoading: boolean;
};

function MobilePromptSendButton({ isLoading }: PromptSendButtonProps) {
  const { settings, setSettings } = useSettings();
  const { models } = useModels();
  const supportedProviders = settings.providers;

  const isTtsSupported = useMemo(() => {
    return !!models.filter((model) => model.id.includes("tts"))?.length;
  }, [models]);

  const { clearAudioQueue } = useAudioPlayer();

  return (
    <ButtonGroup variant="outline" isAttached>
      <Menu placement="top" strategy="fixed" offset={[-90, 0]}>
        <IconButton
          type="submit"
          size="lg"
          variant="solid"
          isRound
          aria-label="Submit"
          isLoading={isLoading}
          icon={<TbSend />}
        />
        {isTtsSupported && (
          <Tooltip
            label={
              settings.textToSpeech.announceMessages
                ? "Text-to-Speech Enabled"
                : "Text-to-Speech Disabled"
            }
          >
            <IconButton
              type="button"
              size="lg"
              variant="solid"
              aria-label={
                settings.textToSpeech.announceMessages
                  ? "Text-to-Speech Enabled"
                  : "Text-to-Speech Disabled"
              }
              icon={
                settings.textToSpeech.announceMessages ? (
                  <MdVolumeUp size={25} />
                ) : (
                  <MdVolumeOff size={25} />
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
            />
          </Tooltip>
        )}
        <MenuButton
          as={IconButton}
          size="lg"
          isRound
          variant="solid"
          aria-label="Choose Model"
          title="Choose Model"
          icon={<TbChevronUp />}
        />
        <MenuList maxHeight={"70vh"} overflowY={"auto"} zIndex={theme.zIndices.dropdown}>
          <MenuGroup title="Models">
            {models
              .filter((model) => !usingOfficialOpenAI() || model.id.includes("gpt"))
              .map((model) => (
                <MenuItem key={model.id} onClick={() => setSettings({ ...settings, model })}>
                  {model.prettyModel}
                </MenuItem>
              ))}
          </MenuGroup>
          <MenuGroup title="Providers">
            {Object.values({
              ...supportedProviders,
              [FREEMODELPROVIDER_API_URL]: new FreeModelProvider(),
            }).map((provider) => (
              <MenuItem
                key={provider.apiUrl}
                onClick={() => {
                  const newProvider = providerFromJSON({
                    id: provider.id,
                    name: provider.name,
                    apiUrl: provider.apiUrl,
                    apiKey: provider.apiKey,
                  });
                  setSettings({ ...settings, currentProvider: newProvider });
                }}
              >
                {settings.currentProvider.apiUrl === provider.apiUrl ? "✔️ " : ""}
                {provider.name}
              </MenuItem>
            ))}
          </MenuGroup>
        </MenuList>
      </Menu>
    </ButtonGroup>
  );
}

function DesktopPromptSendButton({ isLoading }: PromptSendButtonProps) {
  const { settings, setSettings } = useSettings();
  const { models } = useModels();
  const supportedProviders = settings.providers;
  const isTtsSupported = useMemo(() => {
    return !!models.filter((model) => model.id.includes("tts"))?.length;
  }, [models]);

  const { clearAudioQueue } = useAudioPlayer();

  return (
    <ButtonGroup isAttached>
      <Button type="submit" size="sm" isLoading={isLoading} loadingText="Sending">
        Ask {settings.model.prettyModel}
      </Button>
      {isTtsSupported && (
        <Tooltip
          label={
            settings.textToSpeech.announceMessages
              ? "Text-to-Speech Enabled"
              : "Text-to-Speech Disabled"
          }
        >
          <Button
            type="button"
            size="sm"
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
            {settings.textToSpeech.announceMessages ? (
              <MdVolumeUp size={18} />
            ) : (
              <MdVolumeOff size={18} />
            )}
          </Button>
        </Tooltip>
      )}
      <Menu placement="top" strategy="fixed">
        <MenuButton
          as={IconButton}
          size="sm"
          aria-label="Choose Model"
          title="Choose Model"
          icon={<TbChevronUp />}
        />
        <MenuList maxHeight={"70vh"} overflowY={"auto"} zIndex={theme.zIndices.dropdown}>
          <MenuGroup title="Models">
            {models
              .filter((model) => !usingOfficialOpenAI() || model.id.includes("gpt"))
              .map((model) => (
                <MenuItem key={model.id} onClick={() => setSettings({ ...settings, model })}>
                  {model.prettyModel}
                </MenuItem>
              ))}
          </MenuGroup>
          <MenuDivider />
          <MenuGroup title="Providers">
            {Object.values({
              ...supportedProviders,
              [FREEMODELPROVIDER_API_URL]: new FreeModelProvider(),
            }).map((provider) => (
              <MenuItem
                key={provider.apiUrl}
                onClick={() => {
                  const newProvider = providerFromJSON({
                    id: provider.id,
                    name: provider.name,
                    apiUrl: provider.apiUrl,
                    apiKey: provider.apiKey,
                  });
                  setSettings({ ...settings, currentProvider: newProvider });
                }}
              >
                {settings.currentProvider.apiUrl === provider.apiUrl ? "✔️ " : ""}
                {provider.name}
              </MenuItem>
            ))}
          </MenuGroup>
        </MenuList>
      </Menu>
    </ButtonGroup>
  );
}

export default function PromptSendButton(props: PromptSendButtonProps) {
  const isMobile = useMobileBreakpoint();

  return isMobile ? <MobilePromptSendButton {...props} /> : <DesktopPromptSendButton {...props} />;
}
