import { FormEvent, KeyboardEvent, useEffect, useState, type RefObject } from "react";
import { Box, chakra, Flex, Image, CloseButton, Spinner } from "@chakra-ui/react";
import AutoResizingTextarea from "../AutoResizingTextarea";

import { useSettings } from "../../hooks/use-settings";
import OptionsButton from "../OptionsButton";
import MicIcon from "./MicIcon";
import { isTranscriptionSupported } from "../../lib/speech-recognition";
import { useModels } from "../../hooks/use-models";
import PromptSendButton from "./PromptSendButton";
import AudioStatus from "./AudioStatus";
import { useKeyDownHandler } from "../../hooks/use-key-down-handler";
import { ChatCraftChat } from "../../lib/ChatCraftChat";
import { updateImageUrls } from "../../lib/utils";

type MobilePromptFormProps = {
  chat: ChatCraftChat;
  forkUrl: string;
  onSendClick: (prompt: string, imageUrls: string[]) => void;
  inputPromptRef: RefObject<HTMLTextAreaElement>;
  isLoading: boolean;
  previousMessage?: string;
};

function MobilePromptForm({
  chat,
  forkUrl,
  onSendClick,
  inputPromptRef,
  isLoading,
  previousMessage,
}: MobilePromptFormProps) {
  const [prompt, setPrompt] = useState("");
  // Has the user started typing?
  const [isDirty, setIsDirty] = useState(false);
  const { models } = useModels();
  const { settings, setSettings } = useSettings();
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const inputType = isRecording || isTranscribing ? "audio" : "text";
  // Base64 images
  const [inputImageUrls, setInputImageUrls] = useState<string[]>([]);

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

  // Update model to the supported model when inputImages is not empty
  useEffect(() => {
    if (inputImageUrls?.length > 0) {
      const visionModel = models.find((model) => model.supportsImages);
      if (visionModel && visionModel.name != settings.model.name) {
        setSettings({ ...settings, model: visionModel });
      }
    }
  }, [inputImageUrls, models, settings, setSettings]);

  // Handle prompt form submission
  const handlePromptSubmit = (e: FormEvent) => {
    e.preventDefault();
    const textValue = prompt.trim();
    setPrompt("");
    setInputImageUrls([]);
    onSendClick(textValue, inputImageUrls);
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
                onKeyDown={handleKeyDown}
                isDisabled={isLoading}
                autoFocus={true}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                bg="white"
                _dark={{ bg: "gray.700" }}
                overflowY="auto"
                placeholder="Ask about..."
              />
            )}
          </Box>

          {isTranscriptionSupported() && !isTranscribing && !prompt && (
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
