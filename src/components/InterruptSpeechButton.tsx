import { Box, Flex, IconButton, Tooltip, useColorModeValue } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { useCallback, useMemo, useState } from "react";
import useAudioPlayer from "../hooks/use-audio-player";

export const AudioPlayingIcon = ({ size }: { size: "sm" | "md" | "lg" }) => {
  const dimensionsMap: { [key: string]: number } = useMemo(
    () => ({
      sm: 6,
      md: 8,
      lg: 10,
    }),
    []
  );

  const animationVariants = {
    bounce: {
      y: ["0rem", "-0.25rem", "0rem", "0rem", "0rem"],
    },
  };

  return (
    <Box
      as={Flex}
      width={dimensionsMap[size]}
      height={dimensionsMap[size]}
      backgroundColor={useColorModeValue("blue.500", "blue.200")}
      _hover={{ backgroundColor: useColorModeValue("blue.600", "blue.300") }}
      padding={"0.25rem"}
      border={"none"}
      justifyContent={"space-around"}
      alignItems={"center"}
    >
      {/* Bouncing Balls */}
      <motion.span
        variants={animationVariants}
        animate={"bounce"}
        style={{
          width: 5,
          height: 5,
          backgroundColor: useColorModeValue("white", "black"),
          borderRadius: "50%",
        }}
        transition={{ duration: 1, ease: "easeInOut", repeat: Infinity, delay: 0 }}
      ></motion.span>
      <motion.span
        variants={animationVariants}
        animate={"bounce"}
        style={{
          width: 5,
          height: 5,
          backgroundColor: useColorModeValue("white", "black"),
          borderRadius: "50%",
        }}
        transition={{ duration: 1, ease: "easeInOut", repeat: Infinity, delay: 0.1 }}
      ></motion.span>
      <motion.span
        variants={animationVariants}
        animate={"bounce"}
        style={{
          width: 5,
          height: 5,
          backgroundColor: useColorModeValue("white", "black"),
          borderRadius: "50%",
        }}
        transition={{ duration: 1, ease: "easeInOut", repeat: Infinity, delay: 0.2 }}
      ></motion.span>
    </Box>
  );
};

type InterruptSpeechButtonProps = {
  clearOnly?: boolean;
};

const TOOLTIP_OPEN_DURATION = 1;

function InterruptSpeechButton({ clearOnly = false }: InterruptSpeechButtonProps) {
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
    <Box
      as={motion.div}
      exit={{
        scale: 0,
      }}
    >
      <Tooltip
        label={"ChatCraft is speaking... Click to stop"}
        openDelay={tooltipOpenedOnce ? 0 : TOOLTIP_OPEN_DURATION}
        onMouseOver={() => setTooltipOpenedOnce(true)}
        placement="top"
        defaultIsOpen={true}
        offset={[-50, 5]}
      >
        <IconButton
          onClick={handleInterruptAudioQueue}
          size={"sm"}
          aria-label="Stop announcing the message"
          variant={isPlaying ? "solid" : "outline"}
          icon={<AudioPlayingIcon size={"md"} />}
        ></IconButton>
      </Tooltip>
    </Box>
  );
}

export default InterruptSpeechButton;
