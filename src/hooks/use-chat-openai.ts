import { useState, useCallback } from "react";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { CallbackManager } from "langchain/callbacks";
import { BaseChatMessage, AIChatMessage, SystemChatMessage } from "langchain/schema";

import { useSettings } from "./use-settings";

export const systemMessage = `You are ChatCraft.org, a web-based, expert programming AI.
 You help programmers learn, experiment, and be more creative with code.
 Respond in GitHub flavored Markdown. Format ALL lines of code to 80
 characters or fewer. Use Mermaid diagrams when discussing visual topics.`;

// See https://openai.com/pricing
const calculateTokenCost = (tokens: number, model: GptModel): number | undefined => {
  // Pricing is per 1,000K tokens
  tokens = tokens / 1000;

  switch (model) {
    case "gpt-4":
      return tokens * 0.06;
    case "gpt-3.5-turbo":
      return tokens * 0.002;
    default:
      console.warn(`Unknown pricing for OpenAI model ${model}`);
      return undefined;
  }
};

function useChatOpenAI() {
  const [streamingMessage, setStreamingMessage] = useState<AIChatMessage>();
  const { settings } = useSettings();

  const callChatApi = useCallback(
    async (messages: BaseChatMessage[]) => {
      setStreamingMessage(new AIChatMessage(""));

      const chatOpenAI = new ChatOpenAI({
        openAIApiKey: settings.apiKey,
        temperature: 0,
        streaming: true,
        modelName: settings.model,
        callbackManager: CallbackManager.fromHandlers({
          async handleLLMNewToken(token: string) {
            setStreamingMessage((prev) => new AIChatMessage((prev?.text || "") + token));
          },
          async handleChainError(err: any, runId?: string, parentRunId?: string) {
            console.log("handleChainError", err, runId, parentRunId);
          },
          async handleLLMError(err: any, runId?: string, parentRunId?: string) {
            console.log("handleLLMError", err, runId, parentRunId);
          },
        }),
      });

      // Send the chat history + user's prompt, and prefix it all with a system message
      const systemChatMessage = new SystemChatMessage(systemMessage);
      return chatOpenAI
        .call([systemChatMessage, ...messages])
        .finally(() => setStreamingMessage(undefined));
    },
    [settings, setStreamingMessage]
  );

  const getTokenInfo = useCallback(
    async (messages: BaseChatMessage[]): Promise<TokenInfo> => {
      const api = new ChatOpenAI({
        openAIApiKey: settings.apiKey,
        modelName: settings.model,
      });
      const { totalCount } = await api.getNumTokensFromMessages(messages);
      return { count: totalCount, cost: calculateTokenCost(totalCount, settings.model) };
    },
    [settings]
  );

  return { streamingMessage, callChatApi, getTokenInfo };
}

export default useChatOpenAI;
