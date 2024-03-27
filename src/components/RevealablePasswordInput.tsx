import { useState, type ComponentPropsWithRef } from "react";
import { Input, InputGroup, InputRightElement, Button } from "@chakra-ui/react";

type RevealablePasswordInputProps = ComponentPropsWithRef<typeof Input>;

function RevealablePasswordInput(props: RevealablePasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <InputGroup size="sm">
      <Input {...props} pr="2.5rem" type={show ? "text" : "password"} />
      <InputRightElement width="2.5rem">
        <Button variant="ghost" h="1.75rem" size="xs" onClick={() => setShow(!show)}>
          {show ? "Hide" : "Show"}
        </Button>
      </InputRightElement>
    </InputGroup>
  );
}

export default RevealablePasswordInput;
