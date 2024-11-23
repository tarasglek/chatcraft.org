import { Group as ButtonGroup, HStack, Separator, StackSeparator } from "@chakra-ui/react";
import { Tooltip } from "../ui/tooltip";
import { Button } from "../ui/button";
import { TbSend } from "react-icons/tb";
import useMobileBreakpoint from "../../hooks/use-mobile-breakpoint";
import { useSettings } from "../../hooks/use-settings";
import { MdVolumeOff, MdVolumeUp } from "react-icons/md";
import useAudioPlayer from "../../hooks/use-audio-player";
import InterruptSpeechButton from "../InterruptSpeechButton";
import { useTextToSpeech } from "../../hooks/use-text-to-speech";
import { useTheme } from "next-themes";
import CustomMenu from "../Menu/CustomMenu";
type PromptSendButtonProps = {
  isLoading: boolean;
};

function MobilePromptSendButton({ isLoading }: PromptSendButtonProps) {
  const { theme } = useTheme();
  const bgColor = theme === "dark" ? "#90CEF4" : "#2B6CB0";
  //const color = theme === "dark" ? "#333" : "#fff";
  return (
    <ButtonGroup attached>
      <HStack gap={0} separator={<StackSeparator />}>
        <Button
          type="submit"
          size="md"
          fontSize="1.375rem"
          width="2.75rem"
          h={7}
          w={10}
          colorPalette={"blue"}
          bg={{
            base: bgColor,
          }}
          borderLeftRadius={"xl"}
          borderRightRadius={"none"}
          aria-label="Submit"
          loading={isLoading}
        >
          <TbSend />
        </Button>
        <CustomMenu
          placement="top-end"
          strategy="fixed"
          bgColor={bgColor}
          color={"#fff"}
          isLoading={isLoading}
          isMobile={true}
        />
      </HStack>
    </ButtonGroup>
  );
}

function DesktopPromptSendButton({ isLoading }: PromptSendButtonProps) {
  const { settings, setSettings } = useSettings();
  const { theme } = useTheme();
  const bgColor = theme === "dark" ? "#90CEF4" : "#3182CE";
  const color = theme === "dark" ? "#333" : "#fff";
  const { clearAudioQueue, isAudioQueueEmpty } = useAudioPlayer();
  const { isTextToSpeechSupported } = useTextToSpeech();

  return (
    <ButtonGroup attached colorPalette={"blue"}>
      <HStack gap={0} separator={<Separator />}>
        <Button
          type="submit"
          size="sm"
          loading={isLoading}
          loadingText="Sending"
          borderRadius={"xl"}
          colorPalette={"blue"}
          h={7}
          bg={{
            base: bgColor,
          }}
          borderRightRadius={"none"}
          color={color}
        >
          <>Ask {settings.model.prettyModel}</>
        </Button>
        {isTextToSpeechSupported && isAudioQueueEmpty ? (
          <Tooltip
            content={
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
              <>
                {settings.textToSpeech.announceMessages ? (
                  <MdVolumeUp size={18} />
                ) : (
                  <MdVolumeOff size={18} />
                )}
              </>
            </Button>
          </Tooltip>
        ) : isTextToSpeechSupported ? (
          <InterruptSpeechButton variant={"dancingBars"} size={"sm"} clearOnly={!isLoading} />
        ) : null}
        <CustomMenu
          placement="top-end"
          strategy="fixed"
          bgColor={bgColor}
          color={color}
          isLoading={isLoading}
          isMobile={false}
        />
      </HStack>
    </ButtonGroup>
  );
}

export default function PromptSendButton(props: PromptSendButtonProps) {
  const isMobile = useMobileBreakpoint();
  return isMobile ? <MobilePromptSendButton {...props} /> : <DesktopPromptSendButton {...props} />;
}
