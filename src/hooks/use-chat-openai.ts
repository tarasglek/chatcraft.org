import { useState, useCallback, useEffect, useRef } from "react";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { CallbackManager } from "langchain/callbacks";
import { BaseChatMessage, AIChatMessage, SystemChatMessage } from "langchain/schema";
import { useKey } from "react-use";

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
  const [cancel, setCancel] = useState<() => void>(() => {});
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(paused);

  // Listen for escape being pressed on window, and cancel any in flight
  useKey("Escape", cancel, { event: "keydown" }, [cancel]);

  // Make sure we always use the correct `paused` value in our streaming callback below
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const callChatApi = useCallback(
    (messages: BaseChatMessage[]) => {
      const buffer: string[] = [];
      setStreamingMessage(new AIChatMessage(""));

      const chatOpenAI = new ChatOpenAI({
        openAIApiKey: settings.apiKey,
        temperature: 0,
        streaming: true,
        modelName: settings.model,
        callbackManager: CallbackManager.fromHandlers({}),
      });

      // Allow the stream to be cancelled
      const controller = new AbortController();

      // Set the cancel and pause functions
      setCancel(() => () => {
        controller.abort();
      });

      const modifiedSystemMessage = settings.justShowMeTheCode
        ? systemMessage + "Just show me the new code, nothing else. Don't explain anything."
        : systemMessage;
      console.log("modifiedSystemMessage", modifiedSystemMessage);
      // Send the chat history + user's prompt, and prefix it all with a system message
      const systemChatMessage = new SystemChatMessage(modifiedSystemMessage);

      return chatOpenAI
        .call(
          [systemChatMessage, ...messages],
          {
            options: { signal: controller.signal },
          },
          CallbackManager.fromHandlers({
            async handleLLMNewToken(token: string) {
              buffer.push(token);

              if (!pausedRef.current) {
                setStreamingMessage(new AIChatMessage(buffer.join("")));
              }
            },
          })
        )
        .catch((err) => {
          // Deal with cancelled messages by returning a partial message
          if (err.message.startsWith("Cancel:")) {
            buffer.push("...");
            return new AIChatMessage(buffer.join("")) as BaseChatMessage;
          }
          throw err;
        })
        .finally(() => {
          setStreamingMessage(undefined);
          setPaused(false);
        });
    },
    [settings, pausedRef, setStreamingMessage]
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

  return {
    streamingMessage,
    callChatApi,
    getTokenInfo,
    cancel,
    isPaused: paused,
    pause: () => setPaused(true),
    resume: () => setPaused(false),
  };
}

export default useChatOpenAI;
