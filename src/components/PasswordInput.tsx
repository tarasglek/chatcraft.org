import { useState, type ComponentPropsWithRef } from "react";
import { Input, InputGroup, InputRightElement, IconButton } from "@chakra-ui/react";
import { IoMdEye, IoMdEyeOff } from "react-icons/io";

type PasswordInputProps = ComponentPropsWithRef<typeof Input> & {
  buttonSize?: "lg" | "md" | "sm" | "xs";
  isInvalid?: boolean;
};

function PasswordInput({
  isInvalid,
  size = "sm",
  buttonSize = "sm",
  paddingRight = "2.5rem",
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
        type="text"
        sx={{
          WebkitTextSecurity: show ? "none" : "disc",
        }}
      />
      <InputRightElement width={paddingRight}>
        <IconButton
          variant="ghost"
          h="1.75rem"
          size={buttonSize}
          icon={show ? <IoMdEyeOff /> : <IoMdEye />}
          onClick={() => setShow(!show)}
          aria-label={show ? "Hide" : "Show"}
          title={show ? "Hide" : "Show"}
        />
      </InputRightElement>
    </InputGroup>
  );
}

export default PasswordInput;
