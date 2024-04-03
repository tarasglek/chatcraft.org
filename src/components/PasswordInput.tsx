import { useState, type ComponentPropsWithRef } from "react";
import { Input, InputGroup, InputRightElement, Button } from "@chakra-ui/react";

type PasswordInputProps = ComponentPropsWithRef<typeof Input> & {
  size?: "sm" | "md";
  isInvalid?: boolean;
};

function PasswordInput({ size = "md", isInvalid, ...props }: PasswordInputProps) {
  const [show, setShow] = useState(false);

  const paddingRight = size === "sm" ? "2.5rem" : "4.5rem";
  const paddingLeft = size === "sm" ? "0.4rem" : undefined;
  const inputSize = size === "sm" ? "sm" : "md";
  const buttonSize = size === "sm" ? "xs" : "sm";

  return (
    <InputGroup size={inputSize}>
      <Input
        {...props}
        pr={paddingRight}
        pl={paddingLeft}
        type={show ? "text" : "password"}
        focusBorderColor={isInvalid ? "red.500" : "blue.500"}
        borderColor={isInvalid ? "red.500" : "gray.200"}
        isInvalid={isInvalid}
      />
      <InputRightElement width={paddingRight}>
        <Button variant="ghost" h="1.75rem" size={buttonSize} onClick={() => setShow(!show)}>
          {show ? "Hide" : "Show"}
        </Button>
      </InputRightElement>
    </InputGroup>
  );
}

export default PasswordInput;
