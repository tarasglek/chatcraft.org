import React from "react";
import { Image, Flex, Link } from "@chakra-ui/react";
import * as Dialog from "./ui/dialog";

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
}

const ImageModal: React.FC<ImageModalProps> = ({ isOpen, onClose, imageSrc }) => (
  <Dialog.DialogRoot open={isOpen} size="xl">
    <Dialog.DialogBackdrop />
    <Dialog.DialogContent maxW="90vw" maxHeight="90vh">
      <Dialog.DialogCloseTrigger />
      <Dialog.DialogBody>
        <Flex height={"100%"} justifyContent={"center"} alignItems={"center"}>
          <Link href={imageSrc}>
            <Image
              maxWidth="100%"
              maxHeight="70vh"
              overflow={"auto"}
              src={imageSrc}
              alt="Selected Image"
              m="auto"
              objectFit="contain"
            />
          </Link>
        </Flex>
      </Dialog.DialogBody>
    </Dialog.DialogContent>
  </Dialog.DialogRoot>
);

export default ImageModal;
