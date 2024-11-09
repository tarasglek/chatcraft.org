import { FormEvent, KeyboardEvent, type RefObject, useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardBody,
  chakra,
  Flex,
  Image,
  InputGroup,
  Kbd,
  Spinner,
  Square,
  Text,
  useColorModeValue,
  VStack,
} from "@chakra-ui/react";
import AutoResizingTextarea from "../AutoResizingTextarea";
import { useDropzone } from "react-dropzone";

import { useSettings } from "../../hooks/use-settings";
import { compressImageToBase64, getMetaKey, updateImageUrls } from "../../lib/utils";
import { TiDeleteOutline } from "react-icons/ti";
import OptionsButton from "../OptionsButton";
import MicIcon from "./MicIcon";
import PromptSendButton from "./PromptSendButton";
import AudioStatus from "./AudioStatus";
import { useLocation } from "react-router-dom";
import { useKeyDownHandler } from "../../hooks/use-key-down-handler";
import { useAlert } from "../../hooks/use-alert";
import ImageModal from "../ImageModal";
import { ChatCraftChat } from "../../lib/ChatCraftChat";
import { useFileImport } from "../../hooks/use-file-import";

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
    <Text fontSize="sm" color="gray" px={2}>
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
  const [isPromptEmpty, setIsPromptEmpty] = useState(true);
  const { error } = useAlert();
  const { settings } = useSettings();
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
  const importFiles = useFileImport({
    chat,
    onImageImport: (base64) => updateImageUrls(base64, setInputImageUrls),
  });

  const { getRootProps, isDragActive } = useDropzone({
    onDrop: importFiles,
    multiple: true,
    accept: {
      "image/*": [],
      "application/pdf": [".pdf"],
      "application/json": [],
      "application/markdown": [],
      "text/*": [],
    },
  });

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
    const textValue = inputPromptRef.current?.value.trim() || "";
    if (inputPromptRef.current) {
      inputPromptRef.current.value = "";
    }
    setIsPromptEmpty(true);
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
        if (isPromptEmpty && previousMessage && inputPromptRef.current) {
          e.preventDefault();
          inputPromptRef.current.value = previousMessage;
          setIsPromptEmpty(false);
        }
        break;

      // Prevent blank submissions and allow for multiline input.
      case "Enter":
        if (settings.enterBehaviour === "newline") {
          handleMetaEnter(e);
        } else if (settings.enterBehaviour === "send") {
          if (!e.shiftKey && !isPromptEmpty) {
            handlePromptSubmit(e);
          }
        }
        break;

      default:
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
        compressImageToBase64(file, {
          compressionFactor: settings.compressionFactor,
          maxSizeMB: settings.maxCompressedFileSizeMB,
          maxWidthOrHeight: settings.maxImageDimension,
        })
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

  const activeBorder = useColorModeValue("green.100", "green.600");

  return (
    <Flex dir="column" w="100%" h="100%">
      <Card flex={1} my={3} mx={1}>
        <chakra.form onSubmit={handlePromptSubmit} h="100%">
          <CardBody
            h="100%"
            px={6}
            py={4}
            transition="background-color 0.2 ease"
            _hover={{ borderColor: activeBorder }}
            borderColor={isDragActive ? activeBorder : "inherit"}
            {...getRootProps()}
          >
            <VStack w="100%" h="100%" gap={3}>
              <InputGroup h="100%" bg="white" _dark={{ bg: "gray.700" }}>
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
                        onChange={(e) => {
                          setIsPromptEmpty(e.target.value.trim().length === 0);
                        }}
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
                    <MicIcon
                      isDisabled={isLoading}
                      onRecording={handleRecording}
                      onTranscribing={handleTranscribing}
                      onTranscriptionAvailable={handleTranscriptionAvailable}
                      onCancel={handleRecordingCancel}
                    />
                  </Flex>
                </Flex>
              </InputGroup>

              <Flex w="100%" gap={1} justify={"space-between"} align="center">
                <OptionsButton
                  chat={chat}
                  forkUrl={forkUrl}
                  variant="outline"
                  isDisabled={isLoading}
                  onAttachFiles={importFiles}
                />

                <Flex alignItems="center" gap={2}>
                  <KeyboardHint isVisible={!isPromptEmpty && !isLoading} />
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
