import { FormEvent, memo, useState } from "react";
import {
  Button,
  Container,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Select,
  VStack,
} from "@chakra-ui/react";

import MessageBase, { type MessageBaseProps } from "../MessageBase";
import { ChatCraftAppMessage } from "../../../lib/ChatCraftMessage";
import RevealablePasswordInput from "../../RevealablePasswordInput";
import { useSettings } from "../../../hooks/use-settings";
import { openRouterPkceRedirect, validateOpenAiApiKey } from "../../../lib/ai";
import { OPENAI_API_URL, OPENROUTER_API_URL } from "../../../lib/settings";

const ApiKeyInstructionsText = `Welcome to ChatCraft, a developer-focused AI assistant. I can help you write code, visualize it with mermaid, html and even run it. You can further refine code by editig, deleting and retrying model responses.

ChatCraft executes within your browser and communicates directly with LLM API providers. **API keys are stored offline** in your
browser's [local storage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) and are never sent to our servers. You have the option to share your ChatCraft conversations, in which case conversation content will be uploaded to our servers.

ChatCraft is a **"Bring Your Own API Key"** web app. Before you can start chatting, you
need to choose a provider and obtain a key with them:
* [OpenAI](https://openai.com/) offers GPT models but throttles availability of newer models, better performance/uptime than 3rd-party proxies. Start experimenting with $5 in free credit that can be used during your first 3 months.
* [OpenRouter.ai](https://openrouter.ai/docs). Offers OpenAI *GPT models, Anthropic Claude, Google Bard and open source free-to-use models. Has options to prepay, limit costs and offers free credit prior to requiring payment.

Here's an example of what an OpenAI API Key looks like:

\`sk-tVqEo67MxnfAAPQ68iuVT#ClbkFJkUz4oUblcvyUUxrg4T0\`
 
Please choose your API provider and enter your API Key below.
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

  const provider = settings.apiUrl === OPENAI_API_URL ? "OpenAI" : "OpenRouter.ai";
  // Provide a form to enter and process the api key when entered
  const apiKeyForm = (
    <Container pb={6}>
      <form onSubmit={handleApiKeySubmit}>
        <VStack gap={4}>
          <FormControl>
            <FormLabel>API URL</FormLabel>
            <Select
              value={settings.apiUrl}
              onChange={(e) => setSettings({ ...settings, apiUrl: e.target.value })}
            >
              <option value={OPENAI_API_URL}>OpenAI ({OPENAI_API_URL})</option>
              <option value={OPENROUTER_API_URL}>OpenRouter.ai ({OPENROUTER_API_URL})</option>
            </Select>
          </FormControl>

          <FormControl isInvalid={isInvalid}>
            <FormLabel>{provider} API Key </FormLabel>
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
            {provider === "OpenRouter.ai" && (
              <Button mt="3" size="sm" onClick={openRouterPkceRedirect}>
                Get API key from OpenRouter{" "}
              </Button>
            )}
            <FormErrorMessage>Unable to verify API Key with {provider}.</FormErrorMessage>
          </FormControl>
        </VStack>
      </form>
    </Container>
  );

  return <MessageBase {...props} message={message} footer={apiKeyForm} />;
}

export default memo(Instructions);
