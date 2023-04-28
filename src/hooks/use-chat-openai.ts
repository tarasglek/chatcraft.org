import { useState, useCallback } from "react";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { CallbackManager } from "langchain/callbacks";
import { AIChatMessage } from "langchain/schema";

import { useSettings } from "./use-settings";

function useChatOpenAI() {
  const [streamingMessage, setStreamingMessage] = useState<AIChatMessage>();
  const { settings } = useSettings();

  const callChatApi = useCallback(
    async (messagesToSend: AIChatMessage[]) => {
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
      return chatOpenAI.call(messagesToSend).finally(() => setStreamingMessage(undefined));
    },
    [settings, setStreamingMessage]
  );

  return { streamingMessage, callChatApi };
}

export default useChatOpenAI;
