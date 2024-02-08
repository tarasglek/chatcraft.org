import React from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalCloseButton,
  ModalBody,
  Image,
  Box,
  Flex,
} from "@chakra-ui/react";

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
}

const ImageModal: React.FC<ImageModalProps> = ({ isOpen, onClose, imageSrc }) => (
  <Modal isOpen={isOpen} onClose={onClose} size="2xl" isCentered>
    <ModalOverlay />
    <ModalContent maxW="90vw" height="90vh">
      <ModalCloseButton />
      <ModalBody>
        <Flex height={"100%"} justifyContent={"center"} alignItems={"center"}>
          <Image
            maxWidth="100%"
            maxHeight="70vh"
            overflow={"auto"}
            src={imageSrc}
            alt="Selected Image"
            m="auto"
            objectFit="contain"
          />
        </Flex>
      </ModalBody>
    </ModalContent>
  </Modal>
);

export default ImageModal;
