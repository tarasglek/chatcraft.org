// https://github.com/chakra-ui/chakra-ui/issues/670#issuecomment-969444392
import { Textarea, TextareaProps } from "@chakra-ui/react";
import ResizeTextarea from "react-textarea-autosize";
import { forwardRef } from "react";

const AutoResizingTextarea = forwardRef<HTMLTextAreaElement, TextareaProps>((props, ref) => {
  return (
    <Textarea
      minH="unset"
      overflow="hidden"
      w="full"
      maxH="36vh"
      resize="none"
      ref={ref}
      rows={1}
      as={ResizeTextarea}
      {...props}
    />
  );
});

AutoResizingTextarea.displayName = "AutoResizingTextarea";

export default AutoResizingTextarea;
