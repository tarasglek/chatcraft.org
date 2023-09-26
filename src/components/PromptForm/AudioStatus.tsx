import { Flex, Text } from "@chakra-ui/react";
import { TbMicrophone } from "react-icons/tb";
import { MdOutlineTranscribe } from "react-icons/md";

import { formatSeconds } from "../../lib/utils";

type AudioStatusProps = {
  isRecording: boolean;
  recordingSeconds: number;
  isTranscribing: boolean;
};

export default function AudioStatus({
  isTranscribing,
  isRecording,
  recordingSeconds,
}: AudioStatusProps) {
  if (isTranscribing) {
    return (
      <Flex alignItems="center" gap={2}>
        <MdOutlineTranscribe /> Transcribing...
      </Flex>
    );
  }

  if (isRecording) {
    return (
      <Flex alignItems="center" gap={2}>
        <TbMicrophone /> Recording...
        <Text>{formatSeconds(recordingSeconds)}</Text>
      </Flex>
    );
  }

  return <span />;
}
