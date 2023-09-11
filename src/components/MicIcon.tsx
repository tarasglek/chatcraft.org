import { useState } from "react";
import { IconButton } from "@chakra-ui/react";
import { TbMicrophone } from "react-icons/tb";
import { motion, useMotionValue } from "framer-motion";

type MicIconProps = {
  onRecordingStart: () => void;
  onRecordingStop: () => void;
  onRecordingCancel: () => void;
  isDisabled: boolean;
};

export default function MicIcon({
  onRecordingStart,
  onRecordingStop,
  onRecordingCancel,
  isDisabled = false,
}: MicIconProps) {
  const [colorScheme, setColorScheme] = useState<"blue" | "red">("blue");
  const [isRecording, setIsRecording] = useState(false);
  const x = useMotionValue(0);

  const handleRecordingStart = () => {
    setIsRecording(true);
    onRecordingStart();
  };

  const handleRecordingStop = () => {
    setIsRecording(false);
    onRecordingStop();
  };

  const handleRecordingCancel = () => {
    setIsRecording(false);
    onRecordingCancel();
  };

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragTransition={{ bounceStiffness: 500, bounceDamping: 20 }}
      dragElastic={1}
      onTapStart={() => handleRecordingStart()}
      onTap={() => handleRecordingStop()}
      onDrag={(_event, info) => {
        if (info.offset.x < -100) {
          setColorScheme("red");
        } else {
          setColorScheme("blue");
        }
      }}
      onDragEnd={(_event, info) => {
        if (info.offset.x < -100) {
          handleRecordingCancel();
        }
        setColorScheme("blue");
        x.set(0);
      }}
      style={{ x }}
    >
      <IconButton
        isRound
        isDisabled={isDisabled}
        colorScheme={colorScheme}
        icon={<TbMicrophone />}
        variant={isRecording ? "solid" : "ghost"}
        aria-label="Record speech"
        size="sm"
        fontSize="16px"
      />
    </motion.div>
  );
}
