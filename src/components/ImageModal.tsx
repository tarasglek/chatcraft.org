import React from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalCloseButton,
  ModalBody,
  Image,
} from "@chakra-ui/react";

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
}

const ImageModal: React.FC<ImageModalProps> = ({ isOpen, onClose, imageSrc }) => (
  <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
    <ModalOverlay />
    <ModalContent>
      <ModalCloseButton />
      <ModalBody>
        <Image src={imageSrc} alt="Selected Image" maxW="100%" maxH="100vh" m="auto" />
      </ModalBody>
    </ModalContent>
  </Modal>
);

export default ImageModal;
