import {
  FormEvent,
  KeyboardEvent,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  useState,
} from "react";
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
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
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
  const inputBoxRef = useRef<HTMLDivElement | null>(null);
  const suggestionsRef = useRef<HTMLDivElement | null>(null);
  const parentFlexRef = useRef<HTMLDivElement | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ left: number }>({
    left: 0,
  });
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [inputWidth, setInputWidth] = useState<number>(0);
  const [suggestions, setSuggestions] = useState<
    { command: string; helpTitle: string; helpDescription: string }[]
  >([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const availablePrompts = ChatCraftCommandRegistry.getCommands();
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

  // Update when input or suggestions change
  useEffect(() => {
    if (parentFlexRef.current && inputBoxRef.current) {
      const rect = parentFlexRef.current.getBoundingClientRect();
      setInputWidth(rect.width);
      setPopupPosition({
        left: (rect.left + window.scrollX) / 10,
      });
    }
  }, [suggestions.length]);
  // Update width on window resize
  useEffect(() => {
    const updateWidth = () => {
      if (parentFlexRef.current) {
        setInputWidth(parentFlexRef.current.getBoundingClientRect().width);
      }
    };
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        inputBoxRef.current &&
        !inputBoxRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setIsPopoverOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle prompt form submission
  const handlePromptSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const textValue = inputPromptRef.current?.value.trim() || "";
      // Clone the current image urls so we don't lose them when we update state below
      const currentImageUrls = [...inputImageUrls];

      if (inputPromptRef.current) {
        inputPromptRef.current.value = "";
      }
      setIsPromptEmpty(true);
      setInputImageUrls([]);
      setIsPopoverOpen(false);
      onSendClick(textValue, currentImageUrls);
    },
    [inputImageUrls, inputPromptRef, onSendClick]
  );

  const handleMetaEnter = useKeyDownHandler<HTMLTextAreaElement>({
    onMetaEnter: handlePromptSubmit,
  });

  const handleKeyDown = useCallback(
    async (e: KeyboardEvent<HTMLTextAreaElement>) => {
      switch (e.key) {
        // Allow the user to cursor-up to repeat last prompt
        case "ArrowUp":
          if (isPromptEmpty && previousMessage && inputPromptRef.current && !isPopoverOpen) {
            e.preventDefault();
            inputPromptRef.current.value = previousMessage;
            setIsPromptEmpty(false);
          }
          if (isPopoverOpen) {
            e.preventDefault();
            if (selectedIndex == -1) {
              setSelectedIndex(0);
            } else {
              setSelectedIndex((prev) => {
                const nextIndex = prev > 0 ? prev - 1 : 0;
                suggestionRefs.current[nextIndex]?.scrollIntoView({
                  behavior: "smooth",
                  block: "nearest",
                });
                return nextIndex;
              });
            }
          }
          break;
        case "ArrowDown":
          if (isPopoverOpen) {
            e.preventDefault();
            if (selectedIndex == -1) {
              setSelectedIndex(0);
            } else {
              setSelectedIndex((prev) => {
                const nextIndex = prev < suggestions.length - 1 ? prev + 1 : prev;
                suggestionRefs.current[nextIndex]?.scrollIntoView({
                  behavior: "smooth",
                  block: "nearest",
                });
                return nextIndex;
              });
            }
          }
          break;

        // Prevent blank submissions and allow for multiline input.
        case "Enter":
          if (!isPopoverOpen) {
            if (settings.enterBehaviour === "newline") {
              handleMetaEnter(e);
            } else if (settings.enterBehaviour === "send") {
              if (!e.shiftKey && !isPromptEmpty) {
                handlePromptSubmit(e);
              }
            }
          } else {
            e.preventDefault();
            if (
              selectedIndex >= 0 &&
              selectedIndex < suggestions.length &&
              inputPromptRef.current
            ) {
              const selectedSuggestion = suggestions[selectedIndex];
              inputPromptRef.current.value = "/" + selectedSuggestion.command;
              setIsPopoverOpen(false); // Close popover
              //onSendClick(selectedSuggestion.command, []); // Submit selected command
              inputPromptRef.current?.focus(); // Refocus input box
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
    },
    [
      chat,
      handleMetaEnter,
      handlePromptSubmit,
      inputPromptRef,
      isPopoverOpen,
      isPromptEmpty,
      previousMessage,
      selectedIndex,
      settings.enterBehaviour,
      suggestions,
    ]
  );

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
  const bgColor = useColorModeValue("white", "gray.700");
  const hoverBg = useColorModeValue("gray.200", "gray.600");
  return (
    <Flex ref={parentFlexRef} dir="column" w="100%" h="100%">
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
                          borderRadius="5px"
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
                  <Box ref={inputBoxRef} style={{ position: "relative", width: "100%" }}>
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
                        <Popover
                          isOpen={isPopoverOpen}
                          onClose={() => setIsPopoverOpen(false)}
                          autoFocus={false}
                          placement="top"
                        >
                          <PopoverTrigger>
                            <Box ref={inputBoxRef} style={{ width: "90%" }}>
                              <AutoResizingTextarea
                                id="test"
                                ref={inputPromptRef}
                                variant="unstyled"
                                onKeyDown={handleKeyDown}
                                isDisabled={isLoading}
                                autoFocus={true}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setIsPromptEmpty(e.target.value.trim().length === 0);
                                  const filteredSuggestions = val
                                    ? availablePrompts.filter((p) =>
                                        p.helpTitle.toLowerCase().startsWith(val.toLowerCase())
                                      )
                                    : [];
                                  setSuggestions(filteredSuggestions);
                                  setIsPopoverOpen(filteredSuggestions.length > 0);
                                  setSelectedIndex(-1);
                                }}
                                bg="white"
                                _dark={{ bg: "gray.700" }}
                                placeholder={
                                  !isLoading && !isRecording && !isTranscribing
                                    ? "Ask a question or use /help to learn more ('CTRL+l' to clear chat)"
                                    : undefined
                                }
                                overflowY="auto"
                                flex={1}
                              />
                            </Box>
                          </PopoverTrigger>
                          <PopoverContent
                            width={`${inputWidth}px`}
                            borderRadius="10px"
                            boxShadow="lg"
                            bg={bgColor}
                            zIndex="1000"
                            left={popupPosition.left}
                          >
                            <PopoverBody maxHeight="250px" overflowY="auto" p={2} width="100%">
                              {suggestions.map((suggestion, index) => (
                                <Box
                                  key={index}
                                  ref={(el) => (suggestionRefs.current[index] = el)}
                                  p={3}
                                  bg={selectedIndex === index ? hoverBg : bgColor} // Dynamic background
                                  _hover={{ bg: hoverBg }}
                                  cursor="pointer"
                                  borderRadius="8px"
                                  transition="background 0.2s ease-in-out"
                                  onClick={() => {
                                    if (inputPromptRef.current) {
                                      inputPromptRef.current.value = "/" + suggestion.command;
                                    }
                                    setSuggestions([]);
                                    setIsPopoverOpen(false);
                                    inputPromptRef.current?.focus();
                                  }}
                                >
                                  <strong>{suggestion.helpTitle}</strong>
                                  <Box fontSize="sm" color="gray.400">
                                    {suggestion.helpDescription.split(".")[0]}.
                                  </Box>
                                </Box>
                              ))}
                            </PopoverBody>
                          </PopoverContent>
                        </Popover>
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
                  </Box>
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
