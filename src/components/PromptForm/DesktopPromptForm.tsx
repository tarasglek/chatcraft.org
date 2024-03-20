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
  Spinner,
  Square,
} from "@chakra-ui/react";
import AutoResizingTextarea from "../AutoResizingTextarea";

import { useSettings } from "../../hooks/use-settings";
import { getMetaKey, compressImageToBase64, updateImageUrls } from "../../lib/utils";
import { TiDeleteOutline } from "react-icons/ti";
import OptionsButton from "../OptionsButton";
import MicIcon from "./MicIcon";
import { isTranscriptionSupported } from "../../lib/speech-recognition";
import { useModels } from "../../hooks/use-models";
import PromptSendButton from "./PromptSendButton";
import AudioStatus from "./AudioStatus";
import { useLocation } from "react-router-dom";
import { useKeyDownHandler } from "../../hooks/use-key-down-handler";
import { useAlert } from "../../hooks/use-alert";
import ImageModal from "../ImageModal";
import { ChatCraftChat } from "../../lib/ChatCraftChat";

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
  chat: ChatCraftChat;
  forkUrl: string;
  onSendClick: (prompt: string, imageUrls: string[]) => void;
  inputPromptRef: RefObject<HTMLTextAreaElement>;
  isLoading: boolean;
  previousMessage?: string;
};

function DesktopPromptForm({
  chat,
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
      textAreaElement.addEventListener("paste", handlePaste);
    }
    return () => {
      if (textAreaElement) {
        textAreaElement.removeEventListener("paste", handlePaste);
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

  const processImages = (imageFiles: File[]) => {
    setInputImageUrls((prevImageUrls) => [...prevImageUrls, ...imageFiles.map(() => "")]);
    Promise.all(
      imageFiles.map((file) =>
        compressImageToBase64(file, settings.compressionFactor, settings.maxCompressedFileSizeMb)
      )
    )
      .then((base64Strings) => {
        setInputImageUrls((prevImageUrls) => {
          const newImageUrls = [...prevImageUrls];
          base64Strings.forEach((base64, idx) => {
            const placeholderIndex = newImageUrls.indexOf("", idx);
            if (placeholderIndex !== -1) {
              newImageUrls[placeholderIndex] = base64;
            }
          });
          return newImageUrls;
        });
      })
      .catch((err) => {
        console.warn("Error processing images", err);
        error({
          title: "Error Processing Images",
          message: err.message,
        });
      });
  };

  const handleDropImage = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    processImages(imageFiles);
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

  const handlePaste = (e: ClipboardEvent) => {
    const { clipboardData } = e;
    if (!clipboardData) {
      return;
    }

    // See if we have meaningful text. Some apps will place multiple versions in
    // the clipboard. For example, MS Word will include text/plain, text/html,
    // text/rtf, and finally image/png. Each is a different version that tries to
    // preserve formatting (the image is a bitmap of the formatted text). If we
    // have a usable text version, but also an image, we should prefer the text
    // over images. The most common are text, html, or uri-list.
    if (
      clipboardData.getData("text/plain") !== "" ||
      clipboardData.getData("text/html") !== "" ||
      clipboardData.getData("text/uri-list") !== ""
    ) {
      return;
    }

    // Maybe there is an image we can use
    const items = Array.from(clipboardData?.items || []);
    const imageFiles = items
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => file != null);

    if (imageFiles.length) {
      // Handle the clipboard contents here instead, creating image URLs
      e.preventDefault();
      processImages(imageFiles);
    }

    // Otherwise, let the default paste handling happen
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
                        {imageUrl === "" ? (
                          <Box
                            width={100}
                            height={100}
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
                            style={{ height: "100px", objectFit: "cover" }}
                            cursor="pointer"
                            onClick={() => handleClickImage(imageUrl)}
                          />
                        )}
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
                <OptionsButton
                  chat={chat}
                  forkUrl={forkUrl}
                  variant="outline"
                  isDisabled={isLoading}
                  onFileSelected={(base64String) => {
                    updateImageUrls(base64String, setInputImageUrls);
                  }}
                />

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
