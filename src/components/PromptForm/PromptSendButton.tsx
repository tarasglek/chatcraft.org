import { Button, ButtonGroup, IconButton, Tooltip } from "@chakra-ui/react";
import { TbChevronUp, TbSend } from "react-icons/tb";
import useMobileBreakpoint from "../../hooks/use-mobile-breakpoint";
import { useSettings } from "../../hooks/use-settings";
import { useModels } from "../../hooks/use-models";
import theme from "../../theme";
import { MdVolumeOff, MdVolumeUp } from "react-icons/md";
import useAudioPlayer from "../../hooks/use-audio-player";
import InterruptSpeechButton from "../InterruptSpeechButton";
import { useTextToSpeech } from "../../hooks/use-text-to-speech";
import ModelSelectionMenuList from "../Menu/ModelSelectionMenuList";
import { Menu, MenuDivider } from "../Menu";

type PromptSendButtonProps = {
  isLoading: boolean;
};

function MobilePromptSendButton({ isLoading }: PromptSendButtonProps) {
  const { settings, setSettings } = useSettings();
  const { models } = useModels();
  return (
    <ButtonGroup variant="outline" isAttached>
      <IconButton
        // We do want to submit the form when this button is clicked
        type="submit"
        size="md"
        fontSize="1.375rem"
        width="2.75rem"
        variant="solid"
        isRound
        aria-label="Submit"
        isLoading={isLoading}
        icon={<TbSend />}
      />
      <Menu
        position="anchor"
        align="center"
        viewScroll="initial" // Equivalent to Chakra's `strategy="fixed"`
        onItemClick={(e) => {
          e.keepOpen = false; // Prevents the menu from closing automatically
        }}
        menuStyle={{
          maxHeight: "85dvh", // Sets the maximum height
          overflowY: "auto", // Enables vertical scrolling
          zIndex: theme.zIndices.dropdown,
          marginTop: "-90px",
        }}
        menuButton={({ open }) => (
          <button
            // We don't want to submit the form when clicking on the menu
            type="button"
            style={{
              width: "2.5rem",
              height: "2.5rem",
              fontSize: "1.25rem",
              borderRadius: "0 50% 50% 0", // Makes it round
              backgroundColor: open ? "#2c5282" : "#3182ce", // Dynamic color for 'solid' variant
              color: "white", // Icon color
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center", // Centers the icon
              transition: "background-color 0.2s", // Smooth hover effect
            }}
            aria-label="Choose Model"
            title="Choose Model"
          >
            <TbChevronUp />
          </button>
        )}
      >
        <ModelSelectionMenuList
          onItemSelect={(modelId) => {
            const model = models.find((m) => m.id === modelId);
            if (model) setSettings({ ...settings, model });
          }}
        />
      </Menu>
    </ButtonGroup>
  );
}

function DesktopPromptSendButton({ isLoading }: PromptSendButtonProps) {
  const { settings, setSettings } = useSettings();
  const { models } = useModels();

  const { clearAudioQueue, isAudioQueueEmpty } = useAudioPlayer();
  const { isTextToSpeechSupported } = useTextToSpeech();

  return (
    <ButtonGroup isAttached>
      <Button type="submit" size="sm" isLoading={isLoading} loadingText="Sending">
        Ask {settings.model.prettyModel}
      </Button>
      {isTextToSpeechSupported && isAudioQueueEmpty ? (
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
      ) : isTextToSpeechSupported ? (
        <InterruptSpeechButton variant={"dancingBars"} size={"sm"} clearOnly={!isLoading} />
      ) : null}
      <Menu
        position="anchor" // Position relative to the button
        align="end" // Aligns the menu to the end of the trigger (top-end behavior)
        viewScroll="initial" // Mimics Chakra's `strategy="fixed"`
        onItemClick={(e) => {
          e.keepOpen = false; // Keeps the menu open after selection (closeOnSelect={false})
        }}
        menuStyle={{
          zIndex: theme.zIndices.dropdown, // Ensures proper layering
          marginTop: "-90px",
          overflowY: "auto",
          maxHeight: "80dvh",
        }}
        menuButton={({ open }) => (
          <button
            type="button"
            style={{
              width: "2rem", // Matches `size="sm"`
              height: "2rem",
              fontSize: "1.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: open ? "#2c5282" : "#3182ce", // Chakra's solid button color
              color: "white",
              border: "none",
              borderRadius: "0 25% 25% 0", // Fully round button
              cursor: "pointer",
            }}
            aria-label="Choose Model"
            title="Choose Model"
          >
            <TbChevronUp />
          </button>
        )}
      >
        <ModelSelectionMenuList
          onItemSelect={(modelId) => {
            const model = models.find((m) => m.id === modelId);
            if (model) setSettings({ ...settings, model });
          }}
        />
        <MenuDivider />
      </Menu>
    </ButtonGroup>
  );
}

export default function PromptSendButton(props: PromptSendButtonProps) {
  const isMobile = useMobileBreakpoint();

  return isMobile ? <MobilePromptSendButton {...props} /> : <DesktopPromptSendButton {...props} />;
}
