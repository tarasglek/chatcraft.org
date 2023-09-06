import { useState } from "react";
import { IconButton } from "@chakra-ui/react";
import { TbMicrophone } from "react-icons/tb";
import { motion, useSpring } from "framer-motion";

// import { useSettings } from "../hooks/use-settings";

type MicIconProps = {
  onRecordingStart: () => void;
  onRecordingStop: () => void;
  onRecordingCancel: () => void;
};

export default function MicIcon({
  onRecordingStart,
  onRecordingStop,
  onRecordingCancel,
}: MicIconProps) {
  const spring = useSpring(0, { stiffness: 530, damping: 25 });
  const [colorScheme, setColorScheme] = useState<"blue" | "red">("blue");
  const [isRecording, setIsRecording] = useState(false);

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
      }}
      style={{ x: spring }}
    >
      <IconButton
        isRound
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
