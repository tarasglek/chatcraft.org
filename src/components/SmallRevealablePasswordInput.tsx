import { useState, type ComponentPropsWithRef } from "react";
import { Input, InputGroup, InputRightElement, Button } from "@chakra-ui/react";

type SmallRevealablePasswordInputProps = ComponentPropsWithRef<typeof Input> & {
  isInvalid?: boolean;
};

function SmallRevealablePasswordInput({ isInvalid, ...props }: SmallRevealablePasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <InputGroup size="sm">
      <Input
        {...props}
        pr="2.5rem"
        pl="0.4rem"
        type={show ? "text" : "password"}
        focusBorderColor={isInvalid ? "red.500" : "blue.500"}
        borderColor={isInvalid ? "red.500" : "gray.200"}
        isInvalid={isInvalid}
      />
      <InputRightElement width="2.5rem">
        <Button variant="ghost" h="1.75rem" size="xs" onClick={() => setShow(!show)}>
          {show ? "Hide" : "Show"}
        </Button>
      </InputRightElement>
    </InputGroup>
  );
}

export default SmallRevealablePasswordInput;
