import {
  Box,
  Flex,
  IconButton,
  IconButtonProps,
  Tooltip,
  useColorModeValue,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import { useCallback, useMemo, useState } from "react";
import useAudioPlayer from "../hooks/use-audio-player";

export const AudioPlayingIcon = ({ size }: { size: "sm" | "md" | "lg" }) => {
  const containerDimensions: { [key: string]: number } = useMemo(
    () => ({
      sm: 8,
      md: 10,
      lg: 12,
    }),
    []
  );

  const ballDimensions: { [key: string]: number } = useMemo(
    () => ({
      sm: 5,
      md: 6,
      lg: 7,
    }),
    []
  );

  const animationVariants = {
    bounce: {
      y: ["0rem", "-0.25rem", "0rem"],
    },
  };

  const ballStyle = {
    width: ballDimensions[size],
    height: ballDimensions[size],
    backgroundColor: useColorModeValue("white", "black"),
    borderRadius: "50%",
  };

  return (
    <Box
      as={Flex}
      width={containerDimensions[size]}
      height={containerDimensions[size]}
      backgroundColor={useColorModeValue("blue.500", "blue.200")}
      _hover={{ backgroundColor: useColorModeValue("blue.600", "blue.300") }}
      padding={"0.25rem"}
      border={"none"}
      justifyContent={"space-around"}
      alignItems={"center"}
    >
      {/* Bouncing Balls */}
      {[0, 0.1, 0.2].map((delay) => (
        <motion.span
          key={delay}
          variants={animationVariants}
          animate="bounce"
          style={ballStyle}
          transition={{
            duration: 0.3,
            ease: "easeInOut",
            repeatDelay: 0.5,
            repeat: Infinity,
            delay,
          }}
        />
      ))}
    </Box>
  );
};

type InterruptSpeechButtonProps = {
  clearOnly?: boolean;
  size?: "sm" | "md" | "lg";
  buttonProps?: Omit<IconButtonProps, "aria-label">;
};

const TOOLTIP_OPEN_DURATION = 1;

function InterruptSpeechButton({
  clearOnly = false,
  size = "sm",
  buttonProps = {},
}: InterruptSpeechButtonProps) {
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
          size={size}
          border={"none"}
          variant={isPlaying ? "solid" : "outline"}
          icon={<AudioPlayingIcon size={size} />}
          {...buttonProps}
          aria-label="ChatCraft is speaking... Click to stop"
        ></IconButton>
      </Tooltip>
    </Box>
  );
}

export default InterruptSpeechButton;
