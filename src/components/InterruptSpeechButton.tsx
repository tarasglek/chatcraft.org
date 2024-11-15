import {
  Box,
  Flex,
  IconButton,
  IconButtonProps,
  Tooltip,
  useColorModeValue,
} from "@chakra-ui/react";
import { motion, AnimationProps, MotionProps } from "framer-motion";
import { useCallback, useMemo, useState } from "react";
import useAudioPlayer from "../hooks/use-audio-player";

//#region AudioPlayingIcon

type AudioPlayingIconSizes = "sm" | "md" | "lg";

type AudioPlayingIconVariants = "bouncingBall" | "dancingBars";

interface Dimensions {
  width: number | string;
  height: number | string;
}

const NODE_DIMENSIONS: { [key in AudioPlayingIconSizes]: Dimensions } = {
  sm: {
    width: 5,
    height: 5,
  },
  md: {
    width: 6,
    height: 6,
  },
  lg: {
    width: 7,
    height: 7,
  },
};

type AudioPlayingIconProps = {
  size: AudioPlayingIconSizes;
  variant?: AudioPlayingIconVariants;
  playAnimation?: boolean;
};

export const AudioPlayingIcon = ({
  size,
  variant = "bouncingBall",
  playAnimation = true,
}: AudioPlayingIconProps) => {
  const containerDimensions: { [key: string]: number } = useMemo(
    () => ({
      sm: 8,
      md: 10,
      lg: 12,
    }),
    []
  );

  const animationVariants: { [key in AudioPlayingIconVariants]: any } = useMemo(
    () => ({
      bouncingBall: {
        y: ["0rem", "-0.25rem", "0rem"],
      },
      dancingBars: {
        scaleY: [4, 2, 2.5, 2.25, 2.5, 2, 3.0, 2.5, 2, 3.0, 2, 4, 2],
      },
    }),
    []
  );

  const nodeStyles: { [key in AudioPlayingIconVariants]: MotionProps["style"] } = {
    bouncingBall: {
      width: NODE_DIMENSIONS[size].width,
      height: NODE_DIMENSIONS[size].height,
      backgroundColor: useColorModeValue("white", "black"),
      borderRadius: "50%",
    },
    dancingBars: {
      width: NODE_DIMENSIONS[size].width,
      height: NODE_DIMENSIONS[size].height,
      backgroundColor: useColorModeValue("white", "black"),
      borderRadius: "10% / 50%",
    },
  };

  const transitions: { [key in AudioPlayingIconVariants]: AnimationProps["transition"] } =
    useMemo(() => {
      return {
        bouncingBall: { duration: 0.3, ease: "easeInOut", repeatDelay: 0.5, repeat: Infinity },
        dancingBars: {
          duration: 1.5,
          ease: "easeInOut",
          repeat: Infinity,
        },
      };
    }, []);

  return (
    <Flex
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
          key={`animated-child-${delay}`}
          variants={animationVariants}
          animate={playAnimation ? animationVariants[variant] : null}
          style={nodeStyles[variant]}
          transition={{
            delay,
            ...transitions[variant],
          }}
        />
      ))}
    </Flex>
  );
};

//#endregion

type InterruptSpeechButtonProps = {
  clearOnly?: boolean;
  size?: "sm" | "md" | "lg";
  buttonProps?: Omit<IconButtonProps, "aria-label">;
  variant: AudioPlayingIconVariants;
};

const TOOLTIP_OPEN_DURATION = 1;

function InterruptSpeechButton({
  clearOnly = false,
  size = "sm",
  buttonProps = {},
  variant,
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
          icon={<AudioPlayingIcon playAnimation={isPlaying} variant={variant} size={size} />}
          {...buttonProps}
          aria-label="ChatCraft is speaking... Click to stop"
        ></IconButton>
      </Tooltip>
    </Box>
  );
}

export default InterruptSpeechButton;
