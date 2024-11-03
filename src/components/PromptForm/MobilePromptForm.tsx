import { FormEvent, type RefObject, useEffect, useState } from "react";
import { Box, chakra, CloseButton, Flex, Image, Spinner } from "@chakra-ui/react";
import AutoResizingTextarea from "../AutoResizingTextarea";

import { useSettings } from "../../hooks/use-settings";
import OptionsButton from "../OptionsButton";
import MicIcon from "./MicIcon";
import PromptSendButton from "./PromptSendButton";
import AudioStatus from "./AudioStatus";
import { ChatCraftChat } from "../../lib/ChatCraftChat";
import { updateImageUrls } from "../../lib/utils";

type MobilePromptFormProps = {
  chat: ChatCraftChat;
  forkUrl: string;
  onSendClick: (prompt: string, imageUrls: string[]) => void;
  inputPromptRef: RefObject<HTMLTextAreaElement>;
  isLoading: boolean;
};

function MobilePromptForm({
  chat,
  forkUrl,
  onSendClick,
  inputPromptRef,
  isLoading,
}: MobilePromptFormProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const inputType = isRecording || isTranscribing ? "audio" : "text";
  // Base64 images
  const [inputImageUrls, setInputImageUrls] = useState<string[]>([]);

  useEffect(() => {
    if (!isLoading) {
      inputPromptRef.current?.focus();
    }
  }, [isLoading, inputPromptRef]);

  // Keep track of the number of seconds that we've been recording
  useEffect(() => {
    let interval: number | undefined;

    if (isRecording) {
      interval = window.setInterval(() => {
        setRecordingSeconds((seconds) => seconds + 1);
      }, 1_000);
    } else if (!isRecording && recordingSeconds !== 0) {
      window.clearInterval(interval!);
      setRecordingSeconds(0);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRecording, recordingSeconds]);

  // Handle prompt form submission
  const handlePromptSubmit = (e: FormEvent) => {
    e.preventDefault();
    const textValue = inputPromptRef.current?.value.trim() || "";
    if (!textValue) {
      return;
    }
    if (inputPromptRef.current) {
      inputPromptRef.current.value = "";
    }
    setInputImageUrls([]);
    onSendClick(textValue, inputImageUrls);
  };

  const handleRecording = () => {
    // Audio recording has begun
    setIsRecording(true);
    setIsTranscribing(false);
  };

  const handleTranscribing = () => {
    // Recording phase is over, switch to transcription...
    setIsRecording(false);
    setIsTranscribing(true);
  };

  const handleRecordingCancel = () => {
    // The user cancelled the recording, we're done
    setIsRecording(false);
    setIsTranscribing(false);
  };

  const handleTranscriptionAvailable = (transcription: string) => {
    // Transcript is available, so we're done recording/transcribing
    // Reset everything.
    setIsRecording(false);
    setIsTranscribing(false);

    // Use this transcript as our prompt
    onSendClick(transcription, inputImageUrls);
    setInputImageUrls([]);
  };

  const handleDeleteImage = (index: number) => {
    const updatedImageUrls = [...inputImageUrls];
    updatedImageUrls.splice(index, 1);
    setInputImageUrls(updatedImageUrls);
  };

  return (
    <Box flex={1} w="100%" h="100%" my={1} px={2} py={1}>
      <chakra.form onSubmit={handlePromptSubmit} h="100%">
        <Flex alignItems="end" gap={2}>
          <OptionsButton
            chat={chat}
            forkUrl={forkUrl}
            variant="outline"
            iconOnly
            onFileSelected={(base64String) => {
              updateImageUrls(base64String, setInputImageUrls);
            }}
          />

          <Box flex={1}>
            <Flex flexWrap="wrap">
              {inputImageUrls.map((imageUrl, index) => (
                <Box
                  key={index}
                  position="relative"
                  height="70px"
                  display="flex"
                  alignItems="center"
                  m={2}
                >
                  {imageUrl === "" ? (
                    <Box
                      width={70}
                      height={70}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Spinner size="xl" />
                    </Box>
                  ) : (
                    <Image
                      src={imageUrl}
                      alt={`Image# ${index}`}
                      style={{ height: "70px", objectFit: "cover" }}
                      cursor="pointer"
                    />
                  )}
                  <Box
                    key={`${index}-close`}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    top="0"
                    right="0"
                    backgroundColor="grey"
                    color="white"
                    height="70px"
                  >
                    <CloseButton onClick={() => handleDeleteImage(index)} />
                  </Box>
                </Box>
              ))}
            </Flex>
            {inputType === "audio" ? (
              <Box p={2}>
                <AudioStatus
                  isRecording={isRecording}
                  isTranscribing={isTranscribing}
                  recordingSeconds={recordingSeconds}
                />
              </Box>
            ) : (
              <AutoResizingTextarea
                ref={inputPromptRef}
                isDisabled={isLoading}
                autoFocus={true}
                bg="white"
                _dark={{ bg: "gray.700" }}
                overflowY="auto"
                placeholder="Ask about..."
              />
            )}
          </Box>

          {!isTranscribing && (
            <MicIcon
              isDisabled={isLoading}
              onRecording={handleRecording}
              onTranscribing={handleTranscribing}
              onTranscriptionAvailable={handleTranscriptionAvailable}
              onCancel={handleRecordingCancel}
            />
          )}

          {!isRecording && <PromptSendButton isLoading={isLoading} />}
        </Flex>
      </chakra.form>
    </Box>
  );
}

export default MobilePromptForm;
