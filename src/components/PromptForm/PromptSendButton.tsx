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
import { AiFillSound, AiOutlineSound } from "react-icons/ai";
import { isTtsSupported } from "../../lib/ai";

type PromptSendButtonProps = {
  isLoading: boolean;
};

function MobilePromptSendButton({ isLoading }: PromptSendButtonProps) {
  const { settings, setSettings } = useSettings();
  const { models } = useModels();

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
        {isTtsSupported() && (
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
              icon={settings.announceMessages ? <AiFillSound /> : <AiOutlineSound />}
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
          {models.map((model) => (
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

  return (
    <ButtonGroup isAttached>
      <Button type="submit" size="sm" isLoading={isLoading} loadingText="Sending">
        Ask {settings.model.prettyModel}
      </Button>
      {isTtsSupported() && (
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
            {settings.announceMessages ? <AiFillSound /> : <AiOutlineSound />}
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
          {models.map((model) => (
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
