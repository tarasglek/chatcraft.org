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
import { getMetaKey, updateImageUrls } from "../../lib/utils";
import { TiDeleteOutline } from "react-icons/ti";
import OptionsButton from "../OptionsButton";
import MicIcon from "./MicIcon";
import PromptSendButton from "./PromptSendButton";
import AudioStatus from "./AudioStatus";
import { useLocation } from "react-router-dom";
import { useKeyDownHandler } from "../../hooks/use-key-down-handler";
import ImageModal from "../ImageModal";
import { ChatCraftChat } from "../../lib/ChatCraftChat";
import { useFileImport } from "../../hooks/use-file-import";
import PaperclipIcon from "./PaperclipIcon";
import { ChatCraftCommandRegistry } from "../../lib/ChatCraftCommandRegistry";

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
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [],
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
    // Clone the current image urls so we don't lose them when we update state below
    const currentImageUrls = [...inputImageUrls];

    if (inputPromptRef.current) {
      inputPromptRef.current.value = "";
    }
    setIsPromptEmpty(true);
    setInputImageUrls([]);

    onSendClick(textValue, currentImageUrls);
  };

  const handleMetaEnter = useKeyDownHandler<HTMLTextAreaElement>({
    onMetaEnter: handlePromptSubmit,
  });

  const handleKeyDown = async (e: KeyboardEvent<HTMLTextAreaElement>) => {
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

      // Shortcut to "/clear" the chat
      case "l":
        if (e.ctrlKey) {
          e.preventDefault();
          const clearCommand = ChatCraftCommandRegistry.getCommand("/clear");

          if (!clearCommand) {
            return console.error("Could not find '/clear' command in ChatCraftCommandRegistry!");
          }
          await clearCommand(chat, undefined);
        }
        break;

      default:
        return;
    }
  };

  const handlePaste = (e: ClipboardEvent) => {
    const { clipboardData } = e;
    if (!clipboardData) {
      return;
    }

    // Get all items from clipboard
    const items = Array.from(clipboardData.items || []);

    // Extract all valid files from the items
    const files = items
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((file): file is File => file != null);

    // Get text content, being explicit about trimming
    const plainText = clipboardData.getData("text/plain").trim();
    const htmlContent = clipboardData.getData("text/html").trim();
    const uriList = clipboardData.getData("text/uri-list").trim();

    // Special Case 1. check for MS Word-style paste (typically includes plain text,
    // html, rtf, image and the image is a bitmap of the text, which isn't helpful).
    // Here we want to ignore the image and let the default clipboard handling extract
    // useful text.
    const hasRtf = items.some((item) => item.type === "text/rtf");
    const isWordPaste =
      hasRtf && files.some((file) => file.type.startsWith("image/")) && items.length >= 3;
    if (isWordPaste) {
      // Let the default paste handler deal with the text content
      return;
    }

    // Special Case 2: copy/paste image from browser (has image file + <img> HTML)
    if (files.some((file) => file.type.startsWith("image/")) && htmlContent) {
      // See if the HTML content is really just a simple HTML wrapper for an img
      const isImageMarkup = /^[\s]*(?:<meta[^>]+>)?[\s]*<img[^>]+>[\s]*$/i.test(htmlContent);

      if (!htmlContent || isImageMarkup) {
        e.preventDefault();
        importFiles(files);
        return;
      }
    }

    // Special Case 3: Safari image paste (has image file + image URL as text)
    if (files.some((file) => file.type.startsWith("image/"))) {
      const isImageUrl = /^https?:\/\/.*\.(jpg|jpeg|png|gif|webp)/i.test(plainText);
      if (isImageUrl) {
        e.preventDefault();
        importFiles(files);
        return;
      }
    }

    // Special Case 4: if we have meaningful text content, use that
    if (plainText || uriList || htmlContent) {
      return; // Let default paste handle the text
    }

    // Special Case 5: since we have no meaningful text, process any files that remain
    if (files.length) {
      e.preventDefault();
      importFiles(files);
      return;
    }

    // Otherwise, let the default paste handling occur
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

  const dragDropBorderColor = useColorModeValue("blue.200", "blue.600");

  return (
    <Flex dir="column" w="100%" h="100%">
      <Card flex={1} my={3} mx={1}>
        <chakra.form onSubmit={handlePromptSubmit} h="100%">
          <CardBody
            h="100%"
            px={6}
            py={4}
            border={"4px solid"}
            borderColor={isDragActive ? dragDropBorderColor : "transparent"}
            borderRadius={".375rem"}
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
                            ? "Ask a question or use /help to learn more ('CTRL+L' to clear chat)"
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
                    <PaperclipIcon chat={chat} onAttachFiles={importFiles} />
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
