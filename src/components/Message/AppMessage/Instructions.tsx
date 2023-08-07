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

const ApiKeyInstructionsText = `## Getting Started with ChatCraft

Welcome to ChatCraft, your open-source web companion for coding with Large Language Models (LLMs). Designed with developers in mind, ChatCraft transforms the way you interact with GPT models, making it effortless to read, write, debug, and enhance your code.

Whether you're exploring new designs or learning about the latest technologies, ChatCraft is your go-to platform. With a user interface inspired by GitHub, and editable Markdown everywhere, you'll feel right at home from the get-go.

We think ChatCraft is the best platform for learning, experimenting, and getting creative with code. Here's a few of the reasons why we think you'll agree:

🛠️ **You're in Control**: Customize all aspects of a chat. Use your own System Prompts, edit, delete, and retry AI messages with models from competing vendors in the same chat.

🌍 **Multiple AI Providers**: ChatCraft supports both OpenAI and OpenRouter, giving you access to a variety of vendors and models. You aren't limited to ChatGPT any more!

💰 **Cost-effective**: With ChatCraft, you only pay for the calls to AI models you use, with no extra charges for the app or monthly subscription.

🌐 **Browser-based**: No installation or server required! ChatCraft works seamlessly in your browser. Also, because it's the web, ChatCraft can render lots of content automatically, from syntax-highlighted source code to [Mermaid](https://mermaid.js.org/) diagrams to HTML!

🔒 **Privacy-focused**: All chats are stored locally in a searchable database, ensuring your data stays private and secure.

💾 **Export & Backup**: Easily download, copy, and export your chat data for safekeeping or further analysis. You aren't locked into anything.

👩‍💻 **Familiar UI**: Designed with software developers in mind, ChatCraft's interface is inspired by GitHub, making it easy to navigate and use. Edit and format your chats using GitHub flavored Markdown.

🔄 **Collaborative & Shareable**: Share your chats via public URLs, duplicate chats to explore new directions, and collaborate with others.

🔧 **AI + Functions**: Write and execute custom functions, extending the power of LLM models. Functions can be written in ChatCraft itself or hosted remotely.

🎉 **Open Source & Free**: ChatCraft is an open-source project, making it free for everyone to use and contribute to.

## ChatCraft vs. ChatGPT, Copilot

| Feature                               | ChatCraft | ChatGPT | Copilot |
| ------------------------------------- |:---------:|:-------:|:-------:|
| Optimized for conversations about code | ✅        | ❌      | ❌      |
| Previews for Mermaid Diagrams, HTML   | ✅        | ❌      | ❌      |
| Edit Generated Replies                | ✅        | ❌      | ✅      |
| Easy to retry with different AI models| ✅        | ❌      | ❌      |
| Just Show Me The Code                 | ✅        | ❌      | ✅      |
| Edit/Run Generated Code               | ✅        | ❌      | ✅      |
| Open Source                           | ✅        | ❌      | ❌      |

## Quick Start

You can begin using ChatCraft today by following these steps:
1. Choose an **AI provider** below: we support both [OpenAI](https://openai.com/) and [OpenRouter](https://openrouter.ai/). OpenAI supports various versions of ChatGPT (\`gpt-3.5-turbo\`) and GPT-4 models, while OpenRouter adds support for even more models from vendors like Anthropic, Google, and Meta. It's easy to switch providers later, or go back-and-forth.
3. Enter an **API Key**. ChatCraft is a _"bring your own API Key"_ web app. No matter which provider you choose, ChatCraft needs an API Key to start making API calls on your behalf. API Keys are never shared, and get stored in your browser's local storage.
4. Start chatting with AI! Type your question in the textbox at the bottom of the screen and click the **Ask** button to prompt a particular model (switch to a different model whenever you like).
5. Copy, edit, delete, or retry any AI response with a different model until you get the results you need.
6. Every chat is saved to a local, offline database in your browser, which you can search (top of UI) or navigate by opening the sidebar with the hamburger menu in the top-left.

Please choose your API provider and enter your API Key below to get started!
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
