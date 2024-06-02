import { IconButton, Tooltip, theme } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { MdSpatialAudioOff } from "react-icons/md";
import useAudioPlayer from "../hooks/use-audio-player";
import { useCallback, useState } from "react";

type DisableAudioPlayerButtonProps = {
  clearOnly?: boolean;
};

const TOOLTIP_OPEN_DURATION = 1;

function DisableAudioPlayerButton({ clearOnly = false }: DisableAudioPlayerButtonProps) {
  const { disableAudioQueue, clearAudioQueue } = useAudioPlayer();

  const handleDisableAudioQueue = useCallback(() => {
    if (clearOnly) {
      clearAudioQueue();
    } else {
      disableAudioQueue();
    }
  }, [clearAudioQueue, clearOnly, disableAudioQueue]);

  const [tooltipOpenedOnce, setTooltipOpenedOnce] = useState<boolean>(false);

  return (
    <motion.div
      style={{ position: "fixed", zIndex: theme.zIndices.dropdown }}
      animate={{ top: ["-5vh", "10vh"], left: ["-5vw", "3vw"] }}
      transition={{ duration: TOOLTIP_OPEN_DURATION, type: "spring", bounce: 0.4 }}
    >
      <Tooltip
        label={"ChatCraft is speaking... Click to stop"}
        defaultIsOpen={true}
        openDelay={tooltipOpenedOnce ? 0 : TOOLTIP_OPEN_DURATION}
        onMouseOver={() => setTooltipOpenedOnce(true)}
        offset={[100, 5]}
      >
        <IconButton
          onClick={handleDisableAudioQueue}
          rounded={"full"}
          aria-label="Stop announcing the message"
          icon={<MdSpatialAudioOff />}
        ></IconButton>
      </Tooltip>
    </motion.div>
  );
}

export default DisableAudioPlayerButton;
