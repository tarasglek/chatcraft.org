import { useModels } from "../../hooks/use-models";
import { IconButton } from "@chakra-ui/react";
import { Tooltip } from "../ui/tooltip";
import { useRef, useState } from "react";
import { TbMicrophone } from "react-icons/tb";
import { useAlert } from "../../hooks/use-alert";
import useMobileBreakpoint from "../../hooks/use-mobile-breakpoint";
import { SpeechRecognition } from "../../lib/speech-recognition";
import useAudioPlayer from "../../hooks/use-audio-player";
import { isSpeechToTextModel } from "../../lib/ai";

type MicIconProps = {
  onRecording: () => void;
  onTranscribing: () => void;
  onCancel: () => void;
  onTranscriptionAvailable: (transcription: string) => void;
  isDisabled: boolean;
};

export default function MicIcon({
  onRecording,
  onTranscribing,
  onCancel,
  onTranscriptionAvailable,
  isDisabled = false,
}: MicIconProps) {
  const isMobile = useMobileBreakpoint();
  const [isRecording, setIsRecording] = useState(false);
  const micIconRef = useRef<HTMLButtonElement | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
  const { error } = useAlert();
  const { clearAudioQueue } = useAudioPlayer();

  const { getSpeechToTextClient, isSpeechToTextSupported, allProvidersWithModels } = useModels();

  if (!isSpeechToTextSupported) {
    return <></>;
  }

  const onRecordingStart = async () => {
    clearAudioQueue();

    const sttClient = await getSpeechToTextClient();

    if (!sttClient) {
      throw new Error(`No configured provider supports STT`);
    }

    // Find which model to use based on the provider selected by STT client
    const sttProvider = allProvidersWithModels.find((p) => p.apiUrl === sttClient.baseURL);
    const sttModel = sttProvider?.models.find((model) => isSpeechToTextModel(model.name))?.name;

    if (!sttModel) {
      throw new Error(`Can't find "${sttModel}" in "${sttProvider?.name}"'s models list`);
    }

    speechRecognitionRef.current = new SpeechRecognition(sttModel, sttClient);

    // Try to get access to the user's microphone. This may or may not work...
    try {
      await speechRecognitionRef.current.init();
    } catch {
      error({
        title: "Audio Transcription",
        message:
          "Audio transcription requires microphone access. If your browser supports it, please allow this page to access to your microphone in order to record and transcribe speech.",
      });
    }

    // See if the user already cancelled the recording while we waited on mic permission
    if (!speechRecognitionRef.current?.isInitialized) {
      speechRecognitionRef.current = null;
      return;
    }

    // We have mic permission and user is still holding the mic icon. Start recording
    try {
      await speechRecognitionRef.current.start();
      setIsRecording(true);
      onRecording();
    } catch (err: any) {
      console.error(err);
      error({
        title: "Speech Recognition Error",
        message: `Unable to start audio recording: ${err.message}`,
      });
      speechRecognitionRef.current = null;
      setIsRecording(false);
      onCancel();
    }
  };

  const onRecordingStop = async () => {
    setIsRecording(false);

    // See if the recording has already been cancelled, or hasn't been started yet
    const speechRecognition = speechRecognitionRef.current;
    if (!speechRecognition?.isRecording) {
      speechRecognitionRef.current = null;
      return;
    }

    // Stop the in-progress recording and get a transcript
    try {
      onTranscribing();
      const transcript = await speechRecognition.stop();
      if (transcript) {
        onTranscriptionAvailable(transcript);
      }
    } catch (err: any) {
      console.error(err);
      error({
        title: "Error Transcribing Speech",
        message: `There was an error while transcribing: ${err.message}`,
      });
    } finally {
      speechRecognitionRef.current = null;
    }
  };

  const onRecordingCancel = () => {
    speechRecognitionRef.current?.cancel();
    speechRecognitionRef.current = null;
    setIsRecording(false);
    onCancel();
  };

  const handleMicToggle = () => {
    if (isRecording) {
      onRecordingStop();
    } else {
      onRecordingStart();
    }
  };

  return (
    <Tooltip content={isRecording ? "Finish Recording" : "Start Recording"}>
      <IconButton
        rounded={"full"}
        disabled={isDisabled}
        variant={isRecording ? "solid" : isMobile ? "outline" : "ghost"}
        colorScheme={isRecording ? "red" : "blue"}
        aria-label="Record speech"
        size="md"
        transition={"all 150ms ease-in-out"}
        fontSize="1.25rem"
        ref={micIconRef}
        onClick={handleMicToggle}
        onBlur={() => onRecordingCancel()}
      >
        <TbMicrophone />
      </IconButton>
    </Tooltip>
  );
}
