// https://github.com/chakra-ui/chakra-ui/issues/670#issuecomment-969444392
import { Textarea, TextareaProps } from "@chakra-ui/react";
import ResizeTextarea from "react-textarea-autosize";
import { forwardRef } from "react";

export const AutoResizingTextarea = forwardRef<HTMLTextAreaElement, TextareaProps>((props, ref) => {
  return (
    <Textarea
      minH="unset"
      overflow="hidden"
      w="100%"
      maxH="50vh"
      resize="none"
      ref={ref}
      minRows={1}
      as={ResizeTextarea}
      {...props}
    />
  );
});
