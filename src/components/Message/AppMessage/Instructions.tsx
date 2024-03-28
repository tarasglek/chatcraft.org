import { FormEvent, memo, useState, useCallback, ChangeEvent } from "react";
import {
  Button,
  Box,
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
import { providerFromUrl, getSupportedProviders } from "../../../lib/providers";
import { OpenRouterProvider } from "../../../lib/providers/OpenRouterProvider";
import RevealablePasswordInput from "../../RevealablePasswordInput";
import { useSettings } from "../../../hooks/use-settings";
import { FreeModelProvider } from "../../../lib/providers/DefaultProvider/FreeModelProvider";
import { nameToUrlMap } from "../../../lib/ChatCraftProvider";

const ApiKeyInstructionsText = `## Getting Started with ChatCraft

Welcome to ChatCraft, your open-source web companion for coding with Large Language Models (LLMs). Designed with developers in mind, ChatCraft transforms the way you interact with GPT models, making it effortless to read, write, debug, and enhance your code.

We think ChatCraft is the best platform for learning, experimenting, and getting creative with code. Here's a few of the reasons why we think you'll agree:

| Feature                               | ChatCraft | ChatGPT | Copilot |
| ------------------------------------- |:---------:|:-------:|:-------:|
| Optimized for conversations about code | ✅        | ❌      | ❌      |
| Work with models from multiple AI vendors | ✅         |❌       | ❌      |
| Previews for Mermaid Diagrams, HTML   | ✅        | ❌      | ❌      |
| Edit Generated AI Replies             | ✅        | ❌      | ✅      |
| Use Custom System Prompts             | ✅        | ✅      | ❌      |
| Easy to retry with different AI models| ✅        | ❌      | ❌      |
| Edit/Run Generated Code and Custom Functions | ✅        | ❌      | ✅      |
| Open Source                           | ✅        | ❌      | ❌      |

[Learn more about ChatCraft on GitHub](https://github.com/tarasglek/chatcraft.org)

## Quick Start Instructions

You can begin using ChatCraft today by following these steps:
1. Choose an **AI provider** below: we support both [OpenAI](https://openai.com/) and [OpenRouter](https://openrouter.ai/). OpenAI supports various versions of ChatGPT (\`gpt-3.5-turbo\`) and GPT-4 models, while OpenRouter adds support for even more models from vendors like Anthropic, Google, and Meta. It's easy to switch providers later, or go back-and-forth.
3. Enter an **API Key**. ChatCraft is a _"bring your own API Key"_ web app. No matter which provider you choose, ChatCraft needs an API Key to start making API calls on your behalf. API Keys are never shared, and get stored in your browser's local storage.
4. Start chatting with AI! Type your question in the textbox at the bottom of the screen and click the **Ask** button to prompt a particular model (switch to a different model whenever you like).
5. Copy, edit, delete, or retry any AI response with a different model until you get the results you need.
6. Every chat is saved to a local, offline database in your browser, which you can search (top of UI) or navigate by opening the sidebar with the hamburger menu in the top-left.

## Enter AI Provider's API Key

Please choose your API provider and enter your API Key below to get started!
`;

function Instructions(props: MessageBaseProps) {
  const { settings, setSettings } = useSettings();
  const [isValidating, setIsValidating] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);
  const supportedProviders = getSupportedProviders();

  // Override the text of the message
  const message = new ChatCraftAppMessage({ ...props.message, text: ApiKeyInstructionsText });

  const handleApiKeySubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.target as HTMLFormElement);
    const apiKey = data.get("openai-api-key");

    if (typeof apiKey !== "string") {
      return;
    }

    if (settings.currentProvider instanceof FreeModelProvider) {
      // If user chooses the free provider, no need for validation
      setSettings({
        ...settings,
        currentProvider: new FreeModelProvider(),
      });
    } else {
      // See if this API Key is valid
      setIsValidating(true);
      settings.currentProvider
        .validateApiKey(apiKey)
        .then((valid) => {
          if (valid) {
            setIsInvalid(false);

            const newProvider = providerFromUrl(settings.currentProvider.apiUrl, apiKey.trim());

            setSettings({
              ...settings,
              currentProvider: newProvider,
              providers: {
                ...settings.providers,
                [newProvider.name]: newProvider,
              },
            });
          } else {
            setIsInvalid(true);
          }
        })
        .catch((err) => {
          console.warn("Error validating API Key", err);
          setIsInvalid(true);
        })
        .finally(() => setIsValidating(false));
    }
  };

  const handleProviderChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const apiUrl = nameToUrlMap[e.target.value];

      // Get stored data from settings.providers array if exists
      const newProvider = settings.providers[e.target.value]
        ? settings.providers[e.target.value]
        : providerFromUrl(apiUrl);

      if (newProvider instanceof FreeModelProvider) {
        // If user chooses the free provider, set the key automatically
        setSettings({
          ...settings,
          currentProvider: new FreeModelProvider(),
        });
      } else {
        setSettings({
          ...settings,
          currentProvider: newProvider,
        });
      }
    },
    [setSettings, settings]
  );

  // Provide a form to enter and process the api key when entered
  const apiKeyForm = (
    <Container pb={6}>
      {!supportedProviders ? (
        <Box>Loading providers...</Box>
      ) : (
        <form onSubmit={handleApiKeySubmit}>
          <VStack gap={4}>
            <FormControl>
              <FormLabel>Provider API URL</FormLabel>

              <Select value={settings.currentProvider.name} onChange={handleProviderChange}>
                {Object.values(supportedProviders).map((provider) => (
                  <option key={provider.name} value={provider.name}>
                    {provider.name} ({provider.apiUrl})
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl isInvalid={isInvalid}>
              <FormLabel>{settings.currentProvider.name} API Key </FormLabel>
              <Flex gap={4} align="center">
                <RevealablePasswordInput
                  flex="1"
                  type="password"
                  name="openai-api-key"
                  bg="white"
                  _dark={{ bg: "gray.700" }}
                  required={!(settings.currentProvider instanceof FreeModelProvider)}
                />
                <Button type="submit" size="sm" isLoading={isValidating}>
                  Save
                </Button>
              </Flex>
              {settings.currentProvider instanceof OpenRouterProvider && (
                <Button mt="3" size="sm" onClick={settings.currentProvider.openRouterPkceRedirect}>
                  Get API key from OpenRouter{" "}
                </Button>
              )}
              <FormErrorMessage>
                Unable to verify API Key with {settings.currentProvider.name}.
              </FormErrorMessage>
            </FormControl>
          </VStack>
        </form>
      )}
    </Container>
  );

  return <MessageBase {...props} message={message} footer={apiKeyForm} />;
}

export default memo(Instructions);
