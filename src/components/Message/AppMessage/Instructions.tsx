import { FormEvent, memo, useState } from "react";
import {
  Button,
  Container,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
} from "@chakra-ui/react";

import MessageBase, { type MessageBaseProps } from "../MessageBase";
import { ChatCraftAppMessage } from "../../../lib/ChatCraftMessage";
import RevealablePasswordInput from "../../RevealablePasswordInput";
import { useSettings } from "../../../hooks/use-settings";
import { validateOpenAiApiKey } from "../../../lib/ai";

const ApiKeyInstructionsText = `Welcome to ChatCraft, a developer-focused AI assistant.
ChatCraft is a **"Bring Your Own API Key"** web app. Before you can start chatting, you
need to enter an [OpenAI API Key](https://platform.openai.com/account/api-keys). Here's
an example of what an OpenAI API Key looks like:

\`sk-tVqEo67MxnfAAPQ68iuVT#ClbkFJkUz4oUblcvyUUxrg4T0\`
 
Please enter your API Key and it will be stored offline in your
browser's [local storage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage):
`;

function Instructions(props: MessageBaseProps) {
  const { settings, setSettings } = useSettings();
  const [isValidating, setIsValidating] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);

  // Override the text of the message
  const message = new ChatCraftAppMessage({ ...props.message, text: ApiKeyInstructionsText });

  const handleApiKeySubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const data = new FormData(e.target as HTMLFormElement);
    const apiKey = data.get("openai-api-key");
    if (typeof apiKey !== "string") {
      return;
    }

    // See if this API Key is valid
    setIsValidating(true);
    validateOpenAiApiKey(apiKey)
      .then((valid) => {
        if (valid) {
          setIsInvalid(false);
          setSettings({ ...settings, apiKey: apiKey.trim() });
        } else {
          setIsInvalid(true);
        }
      })
      .catch((err) => {
        console.warn("Error validating API Key", err);
        setIsInvalid(true);
      })
      .finally(() => setIsValidating(false));
  };

  // Provide a form to enter and process the api key when entered
  const apiKeyForm = (
    <Container pb={6}>
      <form onSubmit={handleApiKeySubmit}>
        <FormControl isInvalid={isInvalid}>
          <FormLabel>OpenAI API Key</FormLabel>
          <Flex gap={4} align="center">
            <RevealablePasswordInput
              flex="1"
              type="password"
              name="openai-api-key"
              bg="white"
              _dark={{ bg: "gray.700" }}
              required
            />
            <Button type="submit" size="sm" isLoading={isValidating}>
              Save
            </Button>
          </Flex>
          <FormErrorMessage>Unable to verify API Key with OpenAI.</FormErrorMessage>
        </FormControl>
      </form>
    </Container>
  );

  return <MessageBase {...props} message={message} footer={apiKeyForm} />;
}

export default memo(Instructions);
