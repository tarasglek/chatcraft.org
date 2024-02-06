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
  <Modal isOpen={isOpen} onClose={onClose} size="2xl" isCentered>
    <ModalOverlay />
    <ModalContent maxW="90vw" maxH="90vh">
      <ModalCloseButton />
      <ModalBody>
        <Image
          src={imageSrc}
          alt="Selected Image"
          m="auto"
          width="100%"
          maxH="85vh"
          objectFit="contain"
        />
      </ModalBody>
    </ModalContent>
  </Modal>
);

export default ImageModal;
