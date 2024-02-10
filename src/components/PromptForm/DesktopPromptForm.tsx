import { FormEvent, KeyboardEvent, useEffect, useState, type RefObject, useMemo } from "react";
import {
  Box,
  chakra,
  Flex,
  Kbd,
  Text,
  InputGroup,
  VStack,
  Card,
  CardBody,
  Image,
  Square,
} from "@chakra-ui/react";
import AutoResizingTextarea from "../AutoResizingTextarea";

import { useSettings } from "../../hooks/use-settings";
import { getMetaKey } from "../../lib/utils";
import { TiDeleteOutline } from "react-icons/ti";
import NewButton from "../NewButton";
import MicIcon from "./MicIcon";
import AttachFileButton from "./AttachFileButton";
import { isTranscriptionSupported } from "../../lib/speech-recognition";
import { useModels } from "../../hooks/use-models";
import PromptSendButton from "./PromptSendButton";
import AudioStatus from "./AudioStatus";
import { useLocation } from "react-router-dom";
import { useKeyDownHandler } from "../../hooks/use-key-down-handler";
import { useAlert } from "../../hooks/use-alert";
import ImageModal from "../ImageModal";

type KeyboardHintProps = {
  isVisible: boolean;
};

function KeyboardHint({ isVisible }: KeyboardHintProps) {
  const { settings } = useSettings();

  const memo = useMemo(() => getMetaKey(), []);

  if (!isVisible) {
    return <span />;
  }

  return (
    <Text fontSize="sm" color="gray">
      <span>
        {settings.enterBehaviour === "newline" ? (
          <span>
            <Kbd>{memo}</Kbd> + <Kbd>Enter</Kbd> to send
          </span>
        ) : (
          <span>
            <Kbd>Shift</Kbd> + <Kbd>Enter</Kbd> for newline
          </span>
        )}
      </span>
    </Text>
  );
}

type DesktopPromptFormProps = {
  forkUrl: string;
  onSendClick: (prompt: string, imageUrls: string[]) => void;
  inputPromptRef: RefObject<HTMLTextAreaElement>;
  isLoading: boolean;
  previousMessage?: string;
};

function DesktopPromptForm({
  forkUrl,
  onSendClick,
  inputPromptRef,
  isLoading,
  previousMessage,
}: DesktopPromptFormProps) {
  const [prompt, setPrompt] = useState("");
  // Has the user started typing?
  const [isDirty, setIsDirty] = useState(false);
  const { error } = useAlert();
  const { models } = useModels();
  const { settings, setSettings } = useSettings();
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const inputType = isRecording || isTranscribing ? "audio" : "text";
  // Base64 images
  const [inputImageUrls, setInputImageUrls] = useState<string[]>([]);
  // state for the modal display selectedImage
  const [imageModalOpen, setImageModalOpen] = useState<boolean>(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>("");
  const location = useLocation();

  // If the user clears the prompt, allow up-arrow again
  useEffect(() => {
    if (!prompt) {
      setIsDirty(false);
    }
  }, [prompt, setIsDirty]);

  // Focus the prompt form when the user navigates
  useEffect(() => {
    inputPromptRef.current?.focus();
  }, [location, inputPromptRef]);
  // Also focus when the chat stops loading
  useEffect(() => {
    if (!isLoading) {
      inputPromptRef.current?.focus();
    }
  }, [isLoading, inputPromptRef]);
  // Also focus when the attached images changes or closes the image display modal
  useEffect(() => {
    inputPromptRef.current?.focus();
  }, [inputImageUrls, imageModalOpen, inputPromptRef]);

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

  // Attach paste event listener to the textarea
  useEffect(() => {
    const textAreaElement = inputPromptRef.current;
    if (textAreaElement) {
      textAreaElement.addEventListener("paste", handlePasteImage);
    }
    return () => {
      if (textAreaElement) {
        textAreaElement.removeEventListener("paste", handlePasteImage);
      }
    };
    // eslint-disable-next-line
  }, []);

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
    setIsRecording(true);
    setIsTranscribing(false);
  };

  const handleTranscribing = () => {
    setIsRecording(false);
    setIsTranscribing(true);
  };

  const handleRecordingCancel = () => {
    setIsRecording(false);
    setIsTranscribing(false);
  };

  const handleTranscriptionAvailable = (transcription: string) => {
    // Use this transcript as our prompt
    onSendClick(transcription, inputImageUrls);
    setIsRecording(false);
    setIsTranscribing(false);
    setInputImageUrls([]);
  };

  const getBase64FromFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        const base64data = reader.result as string;
        resolve(base64data);
      };
    });
  };

  const handleDropImage = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    Promise.all(
      files.filter((file) => file.type.startsWith("image/")).map((file) => getBase64FromFile(file))
    )
      .then((base64Strings) => {
        setInputImageUrls((prevImageUrls) => [...prevImageUrls, ...base64Strings]);
      })
      .catch((err) => {
        console.warn("Error processing images", err);
        error({
          title: "Error Processing Images",
          message: err.message,
        });
      });
  };

  const handleDeleteImage = (index: number) => {
    const updatedImageUrls = [...inputImageUrls];
    updatedImageUrls.splice(index, 1);
    setInputImageUrls(updatedImageUrls);
  };

  const handleClickImage = (imageUrl: string) => {
    setSelectedImageUrl(imageUrl);
    setImageModalOpen(true);
  };
  const closeModal = () => setImageModalOpen(false);

  const handlePasteImage = (e: ClipboardEvent) => {
    const clipboardData = e.clipboardData;
    const items = Array.from(clipboardData?.items || []);
    const imageFiles = items
      .map((item) => item.getAsFile())
      .filter((file): file is File => file != null && file.type.startsWith("image/"));
    if (imageFiles.length > 0) {
      Promise.all(imageFiles.map((file) => getBase64FromFile(file)))
        .then((base64Strings) => {
          setInputImageUrls((prevImageUrls) => [...prevImageUrls, ...base64Strings]);
        })
        .catch((err) => {
          console.warn("Error processing images", err);
          error({
            title: "Error Processing Images",
            message: err.message,
          });
        });
    }
  };

  return (
    <Flex dir="column" w="100%" h="100%">
      <Card flex={1} my={4} mx={1}>
        <chakra.form onSubmit={handlePromptSubmit} h="100%">
          <CardBody h="100%" p={6}>
            <VStack w="100%" h="100%" gap={3}>
              <InputGroup
                h="100%"
                bg="white"
                _dark={{ bg: "gray.700" }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDropImage}
              >
                <Flex w="100%" h="100%" direction="column">
                  <Flex flexWrap="wrap">
                    {inputImageUrls.map((imageUrl, index) => (
                      <Box key={index} position="relative" height="100px" m={2}>
                        <Image
                          src={imageUrl}
                          alt={`Image# ${index}`}
                          style={{ height: "100px", objectFit: "cover" }}
                          cursor="pointer"
                          onClick={() => handleClickImage(imageUrl)}
                        />
                        <Box
                          position="absolute"
                          top="2px"
                          left="2px"
                          bg="whiteAlpha.600"
                          borderRadius="full"
                          p="1"
                          zIndex="2"
                          _hover={{
                            bg: "blue.500",
                            color: "white",
                          }}
                        >
                          <Square size="1.5em">{index + 1}</Square>
                        </Box>
                        <Box
                          position="absolute"
                          top="2px"
                          right="2px"
                          bg="whiteAlpha.600"
                          borderRadius="full"
                          p="1"
                          onClick={() => handleDeleteImage(index)}
                          cursor="pointer"
                          zIndex="3"
                          _hover={{
                            bg: "red.500",
                            color: "white",
                          }}
                        >
                          <TiDeleteOutline size="1.5em" />
                        </Box>
                      </Box>
                    ))}
                  </Flex>
                  <Flex flexWrap="wrap">
                    <AttachFileButton
                      isDisabled={isLoading}
                      onFileSelected={(base64String) =>
                        setInputImageUrls((prevImageUrls) => [...prevImageUrls, base64String])
                      }
                    />
                    {inputType === "audio" ? (
                      <Box py={2} px={1} flex={1}>
                        <AudioStatus
                          isRecording={isRecording}
                          isTranscribing={isTranscribing}
                          recordingSeconds={recordingSeconds}
                        />
                      </Box>
                    ) : (
                      <AutoResizingTextarea
                        ref={inputPromptRef}
                        variant="unstyled"
                        onKeyDown={handleKeyDown}
                        isDisabled={isLoading}
                        autoFocus={true}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        bg="white"
                        _dark={{ bg: "gray.700" }}
                        placeholder={
                          !isLoading && !isRecording && !isTranscribing
                            ? "Ask a question or use /help to learn more"
                            : undefined
                        }
                        overflowY="auto"
                        flex={1}
                      />
                    )}
                    {isTranscriptionSupported() && (
                      <MicIcon
                        isDisabled={isLoading}
                        onRecording={handleRecording}
                        onTranscribing={handleTranscribing}
                        onTranscriptionAvailable={handleTranscriptionAvailable}
                        onCancel={handleRecordingCancel}
                      />
                    )}
                  </Flex>
                </Flex>
              </InputGroup>

              <Flex w="100%" gap={1} justify={"space-between"} align="center">
                <NewButton forkUrl={forkUrl} variant="outline" />

                <Flex alignItems="center" gap={2}>
                  <KeyboardHint isVisible={!!prompt.length && !isLoading} />
                  <PromptSendButton isLoading={isLoading} />
                </Flex>
              </Flex>
            </VStack>
          </CardBody>
        </chakra.form>
      </Card>
      <ImageModal isOpen={imageModalOpen} onClose={closeModal} imageSrc={selectedImageUrl} />
    </Flex>
  );
}

export default DesktopPromptForm;
