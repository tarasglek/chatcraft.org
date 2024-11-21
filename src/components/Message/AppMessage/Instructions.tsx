import { FormEvent, memo, useState, useEffect } from "react";
import { Box, Container, Flex, VStack, createListCollection } from "@chakra-ui/react";
import { Field } from "../../ui/field";
import {
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from "../../ui/select";

import { Button } from "../../ui/button";

import MessageBase, { type MessageBaseProps } from "../MessageBase";
import { ChatCraftAppMessage } from "../../../lib/ChatCraftMessage";
import { providerFromUrl, supportedProviders } from "../../../lib/providers";
import { OpenRouterProvider } from "../../../lib/providers/OpenRouterProvider";
import PasswordInput from "../../PasswordInput";
import { useSettings } from "../../../hooks/use-settings";
import { FreeModelProvider } from "../../../lib/providers/DefaultProvider/FreeModelProvider";
import { ProviderData } from "../../../lib/ChatCraftProvider";

const ApiKeyInstructionsText = `## Getting Started with ChatCraft

Welcome to ChatCraft, your open-source web companion for coding with Large Language Models (LLMs). Designed with developers in mind, ChatCraft transforms the way you interact with GPT models, making it effortless to read, write, debug, and enhance your code.

We think ChatCraft is the best platform for learning, experimenting, and getting creative with code. Here's a few of the reasons why we think you'll agree:

| Feature                               | ChatCraft | ChatGPT | Copilot |
| ------------------------------------- |:---------:|:-------:|:-------:|
| Optimized for conversations about code | ✅        | ❌      | ❌      |
| Work with models from multiple AI vendors | ✅         |❌       | ❌      |
| Previews for Mermaid/Nomnoml Diagrams, HTML   | ✅        | ❌      | ❌      |
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
  const [selectedProvider, setSelectedProvider] = useState(settings.currentProvider);

  useEffect(() => {
    setSelectedProvider(settings.currentProvider);
  }, [settings.currentProvider]);

  const providersList: ProviderData = {
    ...supportedProviders,
    ...settings.providers,
  };

  const providerListsFramework = createListCollection({
    items: Object.keys(providersList).map((providerKey) => ({
      label: providersList[providerKey].name,
      value: providerKey,
      apiUrl: providersList[providerKey].apiUrl,
    })),
  });

  // Override the text of the message
  const message = new ChatCraftAppMessage({ ...props.message, text: ApiKeyInstructionsText });

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const apiKey = e.target.value;
    const newProvider = providerFromUrl(
      selectedProvider.apiUrl,
      apiKey,
      selectedProvider.name,
      selectedProvider.defaultModel
    );

    setSelectedProvider(newProvider);
    providersList[newProvider.name] = newProvider;

    // Save key to settings.providers
    setSettings({
      ...settings,
      providers: {
        ...settings.providers,
        [newProvider.name]: newProvider,
      },
    });
  };

  const handleApiKeySubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (typeof selectedProvider.apiKey !== "string") {
      return;
    }

    if (selectedProvider instanceof FreeModelProvider) {
      // If user chooses the free provider, no need for validation
      setSettings({
        ...settings,
        currentProvider: new FreeModelProvider(),
      });
    } else {
      // See if this API Key is valid
      setIsValidating(true);
      selectedProvider
        .validateApiKey(selectedProvider.apiKey)
        .then((valid) => {
          if (valid) {
            setIsInvalid(false);

            setSettings({
              ...settings,
              currentProvider: selectedProvider,
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

  // Provide a form to enter and process the api key when entered
  const apiKeyForm = (
    <Container pb={6}>
      {!providersList && providerListsFramework ? (
        <Box>Loading providers...</Box>
      ) : (
        <form onSubmit={handleApiKeySubmit}>
          <VStack gap={4}>
            <Field label="Provider API URL">
              <SelectRoot
                collection={providerListsFramework}
                onValueChange={({ value }) => {
                  setSelectedProvider(providersList[value]);
                  setIsInvalid(false);
                }}
              >
                <SelectLabel>Provider API URL</SelectLabel>
                <SelectTrigger>
                  <SelectValueText placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {providerListsFramework.items.map((item) => (
                    <SelectItem key={item.value} item={item}>
                      {item.label} {item.apiUrl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectRoot>
            </Field>

            <Field
              invalid={isInvalid}
              label={`${selectedProvider.name} API Key`}
              errorText={`Unable to verify API Key with ${selectedProvider.name}.`}
            >
              <Flex gap={4} align="center">
                <>
                  <PasswordInput
                    flex="1"
                    size={"md"}
                    bg="white"
                    _dark={{ bg: "gray.700" }}
                    disabled={selectedProvider instanceof FreeModelProvider}
                    value={selectedProvider.apiKey || ""}
                    onChange={handleApiKeyChange}
                  />
                  <Button type="submit" size="sm" loading={isValidating}>
                    Save
                  </Button>
                </>
              </Flex>
              {selectedProvider instanceof OpenRouterProvider && (
                <Button mt="3" size="sm" onClick={selectedProvider.openRouterPkceRedirect}>
                  Get API key from OpenRouter{" "}
                </Button>
              )}
            </Field>
          </VStack>
        </form>
      )}
    </Container>
  );

  return <MessageBase {...props} message={message} footer={apiKeyForm} />;
}

export default memo(Instructions);
