import { Button, Input, InputGroup, InputRightElement } from "@chakra-ui/react";
import { type ComponentPropsWithRef, useState } from "react";

type PasswordInputProps = ComponentPropsWithRef<typeof Input> & {
  buttonSize?: "lg" | "md" | "sm" | "xs";
  isInvalid?: boolean;
};

function PasswordInput({
  isInvalid,
  size = "sm",
  buttonSize = "sm",
  paddingRight = "4.5rem",
  ...props
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <InputGroup size={size}>
      <Input
        size={size}
        focusBorderColor={isInvalid ? "red.300" : "blue.500"}
        borderColor={isInvalid ? "red.300" : "gray.200"}
        paddingRight={paddingRight}
        isInvalid={isInvalid}
        {...props}
        type={show ? "text" : "password"}
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
