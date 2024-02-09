import { FormEvent, KeyboardEvent, useEffect, useState, type RefObject } from "react";
import { Box, chakra, Flex } from "@chakra-ui/react";
import AutoResizingTextarea from "../AutoResizingTextarea";

import { useSettings } from "../../hooks/use-settings";
import CommandButton from "../CommandButton";
import MicIcon from "./MicIcon";
import { isTranscriptionSupported } from "../../lib/speech-recognition";
import PromptSendButton from "./PromptSendButton";
import AudioStatus from "./AudioStatus";
import { useKeyDownHandler } from "../../hooks/use-key-down-handler";

type MobilePromptFormProps = {
  forkUrl: string;
  onSendClick: (prompt: string) => void;
  inputPromptRef: RefObject<HTMLTextAreaElement>;
  isLoading: boolean;
  previousMessage?: string;
};

function MobilePromptForm({
  forkUrl,
  onSendClick,
  inputPromptRef,
  isLoading,
  previousMessage,
}: MobilePromptFormProps) {
  const [prompt, setPrompt] = useState("");
  // Has the user started typing?
  const [isDirty, setIsDirty] = useState(false);
  const { settings } = useSettings();
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const inputType = isRecording || isTranscribing ? "audio" : "text";

  // If the user clears the prompt, allow up-arrow again
  useEffect(() => {
    if (!prompt) {
      setIsDirty(false);
    }
  }, [prompt, setIsDirty]);

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
    const value = prompt.trim();
    setPrompt("");
    onSendClick(value);
  };

  const handleMetaEnter = useKeyDownHandler<HTMLTextAreaElement>({
    onMetaEnter: handlePromptSubmit,
  });

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    switch (e.key) {
      // Allow the user to cursor-up to repeat last prompt
      case "ArrowUp":
        if (!isDirty && previousMessage) {
          e.preventDefault();
          setPrompt(previousMessage);
          setIsDirty(true);
        }
        break;

      // Prevent blank submissions and allow for multiline input.
      case "Enter":
        // Deal with Enter key based on user preference and state of prompt form
        if (settings.enterBehaviour === "newline") {
          handleMetaEnter(e);
        } else if (settings.enterBehaviour === "send") {
          if (!e.shiftKey && prompt.length) {
            handlePromptSubmit(e);
          }
        }
        break;

      default:
        setIsDirty(true);
        return;
    }
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
    onSendClick(transcription);
  };

  return (
    <Box flex={1} w="100%" h="100%" px={1} pt={2} pb={4}>
      <chakra.form onSubmit={handlePromptSubmit} h="100%">
        <Flex mt={2} pb={2} px={1} alignItems="end" gap={2}>
          <CommandButton forkUrl={forkUrl} variant="outline" iconOnly />

          <Box flex={1}>
            {inputType === "audio" ? (
              <Box py={2} px={1}>
                <AudioStatus
                  isRecording={isRecording}
                  isTranscribing={isTranscribing}
                  recordingSeconds={recordingSeconds}
                />
              </Box>
            ) : (
              <AutoResizingTextarea
                ref={inputPromptRef}
                onKeyDown={handleKeyDown}
                isDisabled={isLoading}
                autoFocus={true}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                bg="white"
                _dark={{ bg: "gray.700" }}
                overflowY="auto"
                placeholder="Ask a question"
                mb={1}
              />
            )}
          </Box>

          {isTranscriptionSupported() && (
            <MicIcon
              isDisabled={isLoading}
              onRecording={handleRecording}
              onTranscribing={handleTranscribing}
              onTranscriptionAvailable={handleTranscriptionAvailable}
              onCancel={handleRecordingCancel}
            />
          )}

          <PromptSendButton isLoading={isLoading} />
        </Flex>
      </chakra.form>
    </Box>
  );
}

export default MobilePromptForm;
