import { IconButton, Tooltip, theme } from "@chakra-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import { MdSpatialAudioOff } from "react-icons/md";
import useAudioPlayer from "../hooks/use-audio-player";
import { useCallback, useState } from "react";

type InterruptSpeechButtonProps = {
  clearOnly?: boolean;
  isVisible: boolean;
};

const TOOLTIP_OPEN_DURATION = 1;

function InterruptSpeechButton({ clearOnly = false, isVisible }: InterruptSpeechButtonProps) {
  const { disableAudioQueue, clearAudioQueue, isPlaying } = useAudioPlayer();

  const handleInterruptAudioQueue = useCallback(() => {
    if (clearOnly) {
      clearAudioQueue();
    } else {
      disableAudioQueue();
    }
  }, [clearAudioQueue, clearOnly, disableAudioQueue]);

  const [tooltipOpenedOnce, setTooltipOpenedOnce] = useState<boolean>(false);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          style={{ position: "fixed", zIndex: theme.zIndices.toast }}
          animate={{ top: ["-5vh", "10vh"], left: ["-5vw", "3vw"] }}
          exit={{
            scale: 0,
          }}
          transition={{ duration: TOOLTIP_OPEN_DURATION, type: "spring", bounce: 0.4 }}
        >
          <Tooltip
            label={"ChatCraft is speaking... Click to stop"}
            openDelay={tooltipOpenedOnce ? 0 : TOOLTIP_OPEN_DURATION}
            onMouseOver={() => setTooltipOpenedOnce(true)}
            defaultIsOpen={true}
            offset={[100, 5]}
          >
            <IconButton
              onClick={handleInterruptAudioQueue}
              rounded={"full"}
              aria-label="Stop announcing the message"
              variant={isPlaying ? "solid" : "outline"}
              icon={<MdSpatialAudioOff />}
            ></IconButton>
          </Tooltip>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default InterruptSpeechButton;
