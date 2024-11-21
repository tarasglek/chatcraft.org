import { useState, type ComponentPropsWithRef } from "react";
import { Input, IconButton, HStack } from "@chakra-ui/react";
import { InputGroup } from "../components/ui/input-group";
import { Field } from "./ui/field";
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
    <HStack>
      <InputGroup boxSize={size} flex="1">
        <Field label="Password">
          <Input
            size={size}
            borderBlockColor={isInvalid ? "red.300" : "blue.500"}
            borderColor={isInvalid ? "red.300" : "gray.200"}
            paddingRight={paddingRight}
            _invalid={isInvalid}
            {...props}
            type="text"
            css={{
              WebkitTextSecurity: show ? "none" : "disc",
            }}
          />
        </Field>
      </InputGroup>
      <InputGroup flex="1">
        <IconButton
          variant="ghost"
          h="1.75rem"
          size={buttonSize}
          onClick={() => setShow(!show)}
          aria-label={show ? "Hide" : "Show"}
          title={show ? "Hide" : "Show"}
        >
          {show ? <IoMdEyeOff /> : <IoMdEye />}
        </IconButton>
      </InputGroup>
    </HStack>
  );
}

export default PasswordInput;
