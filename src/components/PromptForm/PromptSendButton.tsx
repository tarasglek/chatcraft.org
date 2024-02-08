import {
  Button,
  ButtonGroup,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Tooltip,
} from "@chakra-ui/react";
import { TbChevronUp, TbSend } from "react-icons/tb";

import useMobileBreakpoint from "../../hooks/use-mobile-breakpoint";
import { useSettings } from "../../hooks/use-settings";
import { useModels } from "../../hooks/use-models";
import theme from "../../theme";
import { MdVolumeUp, MdVolumeOff } from "react-icons/md";
import { isTtsSupported, usingOfficialOpenAI } from "../../lib/ai";
import { useEffect, useState } from "react";
import { useAlert } from "../../hooks/use-alert";

type PromptSendButtonProps = {
  isLoading: boolean;
};

function MobilePromptSendButton({ isLoading }: PromptSendButtonProps) {
  const { settings, setSettings } = useSettings();
  const { models } = useModels();

  const { error } = useAlert();

  const [isTTSSupported, setIsTTSSupported] = useState(false);

  useEffect(() => {
    async function checkTtsSupport() {
      try {
        const supported = await isTtsSupported();
        setIsTTSSupported(supported);
      } catch (err: any) {
        error({
          title: "Error checking TTS support",
          message: err.message,
        });
      }
    }
    checkTtsSupport();
  }, [error]);

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
        {isTTSSupported && (
          <Tooltip
            label={settings.announceMessages ? "Text-to-Speech Enabled" : "Text-to-Speech Disabled"}
          >
            <IconButton
              type="button"
              size="lg"
              variant="solid"
              aria-label={
                settings.announceMessages ? "Text-to-Speech Enabled" : "Text-to-Speech Disabled"
              }
              icon={
                settings.announceMessages ? <MdVolumeUp size={25} /> : <MdVolumeOff size={25} />
              }
              onClick={() =>
                setSettings({ ...settings, announceMessages: !settings.announceMessages })
              }
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
          {models
            .filter((model) => !usingOfficialOpenAI() || model.id.includes("gpt"))
            .map((model) => (
              <MenuItem key={model.id} onClick={() => setSettings({ ...settings, model })}>
                {model.prettyModel}
              </MenuItem>
            ))}
        </MenuList>
      </Menu>
    </ButtonGroup>
  );
}

function DesktopPromptSendButton({ isLoading }: PromptSendButtonProps) {
  const { settings, setSettings } = useSettings();
  const { models } = useModels();

  const { error } = useAlert();

  const [isTTSSupported, setIsTTSSupported] = useState(false);

  useEffect(() => {
    async function checkTtsSupport() {
      try {
        const supported = await isTtsSupported();
        setIsTTSSupported(supported);
      } catch (err: any) {
        error({
          title: "Error checking TTS support",
          message: err.message,
        });
      }
    }
    checkTtsSupport();
  }, [error]);

  return (
    <ButtonGroup isAttached>
      <Button type="submit" size="sm" isLoading={isLoading} loadingText="Sending">
        Ask {settings.model.prettyModel}
      </Button>
      {isTTSSupported && (
        <Tooltip
          label={settings.announceMessages ? "Text-to-Speech Enabled" : "Text-to-Speech Disabled"}
        >
          <Button
            type="button"
            size="sm"
            onClick={() =>
              setSettings({ ...settings, announceMessages: !settings.announceMessages })
            }
          >
            {settings.announceMessages ? <MdVolumeUp size={18} /> : <MdVolumeOff size={18} />}
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
          {models
            .filter((model) => !usingOfficialOpenAI() || model.id.includes("gpt"))
            .map((model) => (
              <MenuItem key={model.id} onClick={() => setSettings({ ...settings, model })}>
                {model.prettyModel}
              </MenuItem>
            ))}
        </MenuList>
      </Menu>
    </ButtonGroup>
  );
}

export default function PromptSendButton(props: PromptSendButtonProps) {
  const isMobile = useMobileBreakpoint();

  return isMobile ? <MobilePromptSendButton {...props} /> : <DesktopPromptSendButton {...props} />;
}
